// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControlDefaultAdminRules} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

/// @title Joleri Intelligence Access
/// @notice Token-gated subscriptions that require both a current payment and a live JOLR balance.
contract JoleriAccess is AccessControlDefaultAdminRules, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant CONFIG_ROLE = keccak256("CONFIG_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint8 public constant BASIC_PLAN = 1;
    uint8 public constant PRO_PLAN = 2;
    uint8 public constant ELITE_PLAN = 3;

    uint16 public constant MAX_MONTHS_PER_PURCHASE = 12;
    uint48 public constant CONFIG_DELAY = 2 days;
    uint64 public constant BILLING_PERIOD = 30 days;

    struct Plan {
        uint128 minimumBalance;
        uint128 monthlyFee;
        bool enabled;
    }

    struct PendingPlan {
        Plan plan;
        uint48 executableAt;
        bool exists;
    }

    struct Subscription {
        uint64 expiresAt;
        uint128 minimumBalance;
        uint8 planId;
    }

    IERC20 public immutable jolr;
    address public treasury;

    mapping(uint8 planId => Plan plan) private _plans;
    mapping(uint8 planId => PendingPlan pending) private _pendingPlans;
    mapping(address subscriber => Subscription subscription) public subscriptions;

    address public pendingTreasury;
    uint48 public pendingTreasuryExecutableAt;

    error JoleriAccessZeroAddress();
    error JoleriAccessInvalidPlan(uint8 planId);
    error JoleriAccessPlanUnavailable(uint8 planId);
    error JoleriAccessInvalidMonths(uint16 monthsCount);
    error JoleriAccessBalanceRequirement(uint256 requiredBalance, uint256 currentBalance);
    error JoleriAccessActivePlanChange(uint8 currentPlanId, uint8 requestedPlanId);
    error JoleriAccessConfigNotScheduled();
    error JoleriAccessConfigDelay(uint48 executableAt);

    event PlanUpdateScheduled(
        uint8 indexed planId,
        uint128 minimumBalance,
        uint128 monthlyFee,
        bool enabled,
        uint48 executableAt
    );
    event PlanUpdateCancelled(uint8 indexed planId);
    event PlanUpdated(
        uint8 indexed planId,
        uint128 minimumBalance,
        uint128 monthlyFee,
        bool enabled
    );
    event TreasuryUpdateScheduled(address indexed newTreasury, uint48 executableAt);
    event TreasuryUpdateCancelled();
    event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
    event SubscriptionPurchased(
        address indexed subscriber,
        uint8 indexed planId,
        uint16 monthsCount,
        uint256 feePaid,
        uint64 expiresAt
    );

    constructor(IERC20 jolrToken, address initialTreasury, address initialAdmin)
        AccessControlDefaultAdminRules(CONFIG_DELAY, initialAdmin)
    {
        if (address(jolrToken) == address(0) || initialTreasury == address(0)) {
            revert JoleriAccessZeroAddress();
        }

        jolr = jolrToken;
        treasury = initialTreasury;

        _grantRole(CONFIG_ROLE, initialAdmin);
        _grantRole(PAUSER_ROLE, initialAdmin);

        _setInitialPlan(BASIC_PLAN, 10_000 ether, 500 ether);
        _setInitialPlan(PRO_PLAN, 50_000 ether, 2_000 ether);
        _setInitialPlan(ELITE_PLAN, 200_000 ether, 7_500 ether);
    }

    /// @notice Returns the current configuration for a plan.
    function getPlan(uint8 planId) external view returns (Plan memory) {
        _validatePlanId(planId);
        return _plans[planId];
    }

    /// @notice Returns a queued plan change, if any.
    function getPendingPlan(uint8 planId) external view returns (PendingPlan memory) {
        _validatePlanId(planId);
        return _pendingPlans[planId];
    }

    /// @notice Purchases or extends a subscription. Approval for the fee is required first.
    /// @dev The wallet must retain the plan's minimum balance after paying the fee.
    function subscribe(uint8 planId, uint16 monthsCount) external nonReentrant whenNotPaused {
        _validatePlanId(planId);
        Plan memory plan = _plans[planId];

        if (!plan.enabled) {
            revert JoleriAccessPlanUnavailable(planId);
        }
        if (monthsCount == 0 || monthsCount > MAX_MONTHS_PER_PURCHASE) {
            revert JoleriAccessInvalidMonths(monthsCount);
        }

        Subscription memory previous = subscriptions[msg.sender];
        if (previous.expiresAt > block.timestamp && previous.planId != planId) {
            revert JoleriAccessActivePlanChange(previous.planId, planId);
        }

        uint256 fee = uint256(plan.monthlyFee) * monthsCount;
        uint256 requiredBalance = uint256(plan.minimumBalance) + fee;
        uint256 currentBalance = jolr.balanceOf(msg.sender);

        if (currentBalance < requiredBalance) {
            revert JoleriAccessBalanceRequirement(requiredBalance, currentBalance);
        }

        if (fee != 0) {
            jolr.safeTransferFrom(msg.sender, treasury, fee);
        }

        uint256 extensionBase = previous.expiresAt > block.timestamp
            ? previous.expiresAt
            : block.timestamp;
        uint64 newExpiration = SafeCast.toUint64(
            extensionBase + (uint256(BILLING_PERIOD) * monthsCount)
        );

        subscriptions[msg.sender] = Subscription({
            expiresAt: newExpiration,
            minimumBalance: plan.minimumBalance,
            planId: planId
        });

        emit SubscriptionPurchased(msg.sender, planId, monthsCount, fee, newExpiration);
    }

    /// @notice True only while the subscription is current and the minimum JOLR balance is held.
    /// @dev Disabling a plan blocks new purchases but does not revoke already-paid access.
    function hasAccess(address subscriber) public view returns (bool) {
        Subscription memory subscription = subscriptions[subscriber];
        if (subscription.expiresAt <= block.timestamp || subscription.planId == 0) {
            return false;
        }

        return jolr.balanceOf(subscriber) >= subscription.minimumBalance;
    }

    /// @notice Single-call status endpoint for the Joleri backend.
    function accessStatus(address subscriber)
        external
        view
        returns (
            bool active,
            uint8 planId,
            uint64 expiresAt,
            uint256 minimumBalance,
            uint256 currentBalance
        )
    {
        Subscription memory subscription = subscriptions[subscriber];
        uint256 balance = jolr.balanceOf(subscriber);

        return (
            subscription.expiresAt > block.timestamp &&
                subscription.planId != 0 &&
                balance >= subscription.minimumBalance,
            subscription.planId,
            subscription.expiresAt,
            subscription.minimumBalance,
            balance
        );
    }

    /// @notice Queues a plan change. It cannot be executed for two days.
    function schedulePlanUpdate(
        uint8 planId,
        uint128 minimumBalance,
        uint128 monthlyFee,
        bool enabled
    ) external onlyRole(CONFIG_ROLE) {
        _validatePlanId(planId);
        uint48 executableAt = SafeCast.toUint48(block.timestamp) + CONFIG_DELAY;

        _pendingPlans[planId] = PendingPlan({
            plan: Plan({
                minimumBalance: minimumBalance,
                monthlyFee: monthlyFee,
                enabled: enabled
            }),
            executableAt: executableAt,
            exists: true
        });

        emit PlanUpdateScheduled(
            planId,
            minimumBalance,
            monthlyFee,
            enabled,
            executableAt
        );
    }

    function cancelPlanUpdate(uint8 planId) external onlyRole(CONFIG_ROLE) {
        _validatePlanId(planId);
        if (!_pendingPlans[planId].exists) {
            revert JoleriAccessConfigNotScheduled();
        }

        delete _pendingPlans[planId];
        emit PlanUpdateCancelled(planId);
    }

    /// @notice Executes a mature plan change. Anyone may execute once the delay has elapsed.
    function executePlanUpdate(uint8 planId) external {
        _validatePlanId(planId);
        PendingPlan memory pending = _pendingPlans[planId];

        if (!pending.exists) {
            revert JoleriAccessConfigNotScheduled();
        }
        if (block.timestamp < pending.executableAt) {
            revert JoleriAccessConfigDelay(pending.executableAt);
        }

        _plans[planId] = pending.plan;
        delete _pendingPlans[planId];

        emit PlanUpdated(
            planId,
            pending.plan.minimumBalance,
            pending.plan.monthlyFee,
            pending.plan.enabled
        );
    }

    function scheduleTreasuryUpdate(address newTreasury) external onlyRole(CONFIG_ROLE) {
        if (newTreasury == address(0)) {
            revert JoleriAccessZeroAddress();
        }

        pendingTreasury = newTreasury;
        pendingTreasuryExecutableAt = SafeCast.toUint48(block.timestamp) + CONFIG_DELAY;
        emit TreasuryUpdateScheduled(newTreasury, pendingTreasuryExecutableAt);
    }

    function cancelTreasuryUpdate() external onlyRole(CONFIG_ROLE) {
        if (pendingTreasury == address(0)) {
            revert JoleriAccessConfigNotScheduled();
        }

        delete pendingTreasury;
        delete pendingTreasuryExecutableAt;
        emit TreasuryUpdateCancelled();
    }

    /// @notice Executes a mature treasury change. Anyone may execute once the delay has elapsed.
    function executeTreasuryUpdate() external {
        address newTreasury = pendingTreasury;
        uint48 executableAt = pendingTreasuryExecutableAt;

        if (newTreasury == address(0)) {
            revert JoleriAccessConfigNotScheduled();
        }
        if (block.timestamp < executableAt) {
            revert JoleriAccessConfigDelay(executableAt);
        }

        address previousTreasury = treasury;
        treasury = newTreasury;
        delete pendingTreasury;
        delete pendingTreasuryExecutableAt;

        emit TreasuryUpdated(previousTreasury, newTreasury);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _setInitialPlan(uint8 planId, uint128 minimumBalance, uint128 monthlyFee)
        private
    {
        _plans[planId] = Plan({
            minimumBalance: minimumBalance,
            monthlyFee: monthlyFee,
            enabled: true
        });
        emit PlanUpdated(planId, minimumBalance, monthlyFee, true);
    }

    function _validatePlanId(uint8 planId) private pure {
        if (planId < BASIC_PLAN || planId > ELITE_PLAN) {
            revert JoleriAccessInvalidPlan(planId);
        }
    }
}
