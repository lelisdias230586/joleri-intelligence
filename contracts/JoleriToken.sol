// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControlDefaultAdminRules} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title Joleri Intelligence Token
/// @notice Fixed-supply utility token for access to Joleri Intelligence products.
/// @dev There is intentionally no mint function and no transfer tax.
contract JoleriToken is
    ERC20,
    ERC20Burnable,
    ERC20Pausable,
    ERC20Permit,
    AccessControlDefaultAdminRules
{
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint48 public constant ADMIN_TRANSFER_DELAY = 2 days;
    uint256 public constant MAX_SUPPLY = 100_000_000 ether;

    error JoleriTokenZeroAddress();

    /// @param initialAdmin Intended to be a multisig in production.
    /// @param initialSupplyRecipient Receives the complete fixed supply once.
    constructor(address initialAdmin, address initialSupplyRecipient)
        ERC20("Joleri Intelligence", "JOLR")
        ERC20Permit("Joleri Intelligence")
        AccessControlDefaultAdminRules(ADMIN_TRANSFER_DELAY, initialAdmin)
    {
        if (initialSupplyRecipient == address(0)) {
            revert JoleriTokenZeroAddress();
        }

        _grantRole(PAUSER_ROLE, initialAdmin);
        _mint(initialSupplyRecipient, MAX_SUPPLY);
    }

    /// @notice Emergency stop for all token movements, minting, and burning.
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Resumes token movements after an emergency has been resolved.
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}
