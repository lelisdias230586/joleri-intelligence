// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {VestingWallet} from "@openzeppelin/contracts/finance/VestingWallet.sol";
import {VestingWalletCliff} from "@openzeppelin/contracts/finance/VestingWalletCliff.sol";

/// @title Joleri Vesting Wallet
/// @notice Linear vesting that starts at deployment and releases nothing before its cliff.
contract JoleriVestingWallet is VestingWalletCliff {
    constructor(address beneficiary, uint64 durationSeconds, uint64 cliffSeconds)
        VestingWallet(beneficiary, uint64(block.timestamp), durationSeconds)
        VestingWalletCliff(cliffSeconds)
    {}
}
