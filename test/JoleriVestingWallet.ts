import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther } from "viem";

describe("JoleriVestingWallet", async function () {
  const { viem, networkHelpers } = await network.create();
  const publicClient = await viem.getPublicClient();

  it("releases nothing before the cliff and all tokens by the end", async function () {
    const [admin, beneficiary] = await viem.getWalletClients();
    const token = await viem.deployContract("JoleriToken", [
      admin.account.address,
      admin.account.address,
    ]);
    const vesting = await viem.deployContract("JoleriVestingWallet", [
      beneficiary.account.address,
      1_000n,
      200n,
    ]);
    const allocation = parseEther("1000");

    await token.write.transfer([vesting.address, allocation]);
    const start = await vesting.read.start();

    await networkHelpers.time.increaseTo(Number(start + 199n));
    assert.equal(await vesting.read.releasable([token.address]), 0n);

    const midpoint = start + 500n;
    assert.equal(
      await vesting.read.vestedAmount([token.address, midpoint]),
      allocation / 2n,
    );

    await networkHelpers.time.increaseTo(Number(start + 1_000n));
    assert.equal(await vesting.read.releasable([token.address]), allocation);

    const vestingAsBeneficiary = await viem.getContractAt(
      "JoleriVestingWallet",
      vesting.address,
      { client: { public: publicClient, wallet: beneficiary } },
    );
    await vestingAsBeneficiary.write.release([token.address]);

    assert.equal(
      await token.read.balanceOf([beneficiary.account.address]),
      allocation,
    );
    assert.equal(await token.read.balanceOf([vesting.address]), 0n);
  });
});
