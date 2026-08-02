import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { getAddress, parseEther, zeroAddress } from "viem";

describe("JoleriAccess", async function () {
  const { viem, networkHelpers } = await network.create();
  const publicClient = await viem.getPublicClient();

  async function deployFixture() {
    const [admin, user, treasury, newTreasury, outsider] =
      await viem.getWalletClients();

    const token = await viem.deployContract("JoleriToken", [
      admin.account.address,
      admin.account.address,
    ]);
    const access = await viem.deployContract("JoleriAccess", [
      token.address,
      treasury.account.address,
      admin.account.address,
    ]);

    const tokenAsUser = await viem.getContractAt("JoleriToken", token.address, {
      client: { public: publicClient, wallet: user },
    });
    const accessAsUser = await viem.getContractAt(
      "JoleriAccess",
      access.address,
      { client: { public: publicClient, wallet: user } },
    );
    const accessAsOutsider = await viem.getContractAt(
      "JoleriAccess",
      access.address,
      { client: { public: publicClient, wallet: outsider } },
    );

    return {
      admin,
      user,
      treasury,
      newTreasury,
      outsider,
      token,
      access,
      tokenAsUser,
      accessAsUser,
      accessAsOutsider,
    };
  }

  it("starts with transparent Basic, Pro, and Elite plans", async function () {
    const { outsider, access } = await deployFixture();

    assert.deepEqual(await access.read.getPlan([1]), {
      minimumBalance: parseEther("10000"),
      monthlyFee: parseEther("500"),
      enabled: true,
    });
    assert.deepEqual(await access.read.getPlan([2]), {
      minimumBalance: parseEther("50000"),
      monthlyFee: parseEther("2000"),
      enabled: true,
    });
    assert.deepEqual(await access.read.getPlan([3]), {
      minimumBalance: parseEther("200000"),
      monthlyFee: parseEther("7500"),
      enabled: true,
    });
    assert.equal(await access.read.hasAccess([outsider.account.address]), false);
  });

  it("rejects zero addresses in deployment", async function () {
    const { admin, treasury, token, access } = await deployFixture();

    await viem.assertions.revertWithCustomError(
      viem.deployContract("JoleriAccess", [
        zeroAddress,
        treasury.account.address,
        admin.account.address,
      ]),
      access,
      "JoleriAccessZeroAddress",
    );
    await viem.assertions.revertWithCustomError(
      viem.deployContract("JoleriAccess", [
        token.address,
        zeroAddress,
        admin.account.address,
      ]),
      access,
      "JoleriAccessZeroAddress",
    );
  });

  it("requires the fee plus enough remaining balance for access", async function () {
    const { user, treasury, token, access, tokenAsUser, accessAsUser } =
      await deployFixture();
    const required = parseEther("10500");
    const fee = parseEther("500");

    await token.write.transfer([user.account.address, required]);
    await tokenAsUser.write.approve([access.address, fee]);
    await accessAsUser.write.subscribe([1, 1]);

    assert.equal(
      await token.read.balanceOf([treasury.account.address]),
      fee,
    );
    assert.equal(
      await token.read.balanceOf([user.account.address]),
      parseEther("10000"),
    );
    assert.equal(await access.read.hasAccess([user.account.address]), true);

    const status = await access.read.accessStatus([user.account.address]);
    assert.equal(status[0], true);
    assert.equal(status[1], 1);
    assert.equal(status[3], parseEther("10000"));
    assert.equal(status[4], parseEther("10000"));
  });

  it("revokes access dynamically if the minimum balance is no longer held", async function () {
    const { user, outsider, token, access, tokenAsUser, accessAsUser } =
      await deployFixture();

    await token.write.transfer([user.account.address, parseEther("10500")]);
    await tokenAsUser.write.approve([access.address, parseEther("500")]);
    await accessAsUser.write.subscribe([1, 1]);
    assert.equal(await access.read.hasAccess([user.account.address]), true);

    await tokenAsUser.write.transfer([outsider.account.address, 1n]);
    assert.equal(await access.read.hasAccess([user.account.address]), false);
  });

  it("rejects an underfunded subscription", async function () {
    const { user, token, access, tokenAsUser, accessAsUser } =
      await deployFixture();
    const underfunded = parseEther("10499");

    await token.write.transfer([user.account.address, underfunded]);
    await tokenAsUser.write.approve([access.address, parseEther("500")]);

    await viem.assertions.revertWithCustomError(
      accessAsUser.write.subscribe([1, 1]),
      access,
      "JoleriAccessBalanceRequirement",
    );
  });

  it("extends the same plan without resetting paid time", async function () {
    const { user, token, access, tokenAsUser, accessAsUser } =
      await deployFixture();

    await token.write.transfer([user.account.address, parseEther("11000")]);
    await tokenAsUser.write.approve([access.address, parseEther("1000")]);

    await accessAsUser.write.subscribe([1, 1]);
    const firstExpiry = (await access.read.accessStatus([
      user.account.address,
    ]))[2];

    await accessAsUser.write.subscribe([1, 1]);
    const secondExpiry = (await access.read.accessStatus([
      user.account.address,
    ]))[2];

    assert.equal(
      secondExpiry,
      firstExpiry + (await access.read.BILLING_PERIOD()),
    );
  });

  it("blocks plan switching while paid time remains", async function () {
    const { user, treasury, token, access, tokenAsUser, accessAsUser } =
      await deployFixture();

    await token.write.transfer([user.account.address, parseEther("52500")]);
    await tokenAsUser.write.approve([access.address, parseEther("2500")]);
    await accessAsUser.write.subscribe([1, 1]);

    await viem.assertions.revertWithCustomError(
      accessAsUser.write.subscribe([2, 1]),
      access,
      "JoleriAccessActivePlanChange",
    );
    assert.equal(
      await token.read.balanceOf([treasury.account.address]),
      parseEther("500"),
    );
  });

  it("rejects unknown plans and invalid purchase periods", async function () {
    const { access, accessAsUser } = await deployFixture();

    await viem.assertions.revertWithCustomError(
      accessAsUser.write.subscribe([0, 1]),
      access,
      "JoleriAccessInvalidPlan",
    );
    await viem.assertions.revertWithCustomError(
      accessAsUser.write.subscribe([1, 0]),
      access,
      "JoleriAccessInvalidMonths",
    );
    await viem.assertions.revertWithCustomError(
      accessAsUser.write.subscribe([1, 13]),
      access,
      "JoleriAccessInvalidMonths",
    );
  });

  it("enforces the two-day delay before plan changes", async function () {
    const { access, accessAsOutsider } = await deployFixture();
    const newMinimum = parseEther("20000");
    const newFee = parseEther("750");

    await access.write.schedulePlanUpdate([1, newMinimum, newFee, true]);
    const pending = await access.read.getPendingPlan([1]);
    assert.equal(pending.exists, true);
    assert.equal(pending.plan.minimumBalance, newMinimum);

    await viem.assertions.revertWithCustomError(
      accessAsOutsider.write.executePlanUpdate([1]),
      access,
      "JoleriAccessConfigDelay",
    );

    await networkHelpers.time.increase(2 * 24 * 60 * 60 + 1);
    await accessAsOutsider.write.executePlanUpdate([1]);

    assert.deepEqual(await access.read.getPlan([1]), {
      minimumBalance: newMinimum,
      monthlyFee: newFee,
      enabled: true,
    });
  });

  it("can cancel a queued plan change", async function () {
    const { access, accessAsOutsider } = await deployFixture();

    await access.write.schedulePlanUpdate([
      1,
      parseEther("15000"),
      parseEther("600"),
      true,
    ]);
    await access.write.cancelPlanUpdate([1]);
    assert.equal((await access.read.getPendingPlan([1])).exists, false);

    await viem.assertions.revertWithCustomError(
      accessAsOutsider.write.executePlanUpdate([1]),
      access,
      "JoleriAccessConfigNotScheduled",
    );
    await viem.assertions.revertWithCustomError(
      access.write.cancelPlanUpdate([1]),
      access,
      "JoleriAccessConfigNotScheduled",
    );
  });

  it("supports a scheduled zero-fee plan without token approval", async function () {
    const { user, treasury, token, access, accessAsUser } =
      await deployFixture();

    await access.write.schedulePlanUpdate([
      1,
      parseEther("10000"),
      0n,
      true,
    ]);
    await networkHelpers.time.increase(2 * 24 * 60 * 60 + 1);
    await accessAsUser.write.executePlanUpdate([1]);

    await token.write.transfer([user.account.address, parseEther("10000")]);
    await accessAsUser.write.subscribe([1, 1]);

    assert.equal(await access.read.hasAccess([user.account.address]), true);
    assert.equal(await token.read.balanceOf([treasury.account.address]), 0n);
  });

  it("preserves the contracted balance threshold for an active subscription", async function () {
    const { user, token, access, tokenAsUser, accessAsUser } =
      await deployFixture();

    await token.write.transfer([user.account.address, parseEther("10500")]);
    await tokenAsUser.write.approve([access.address, parseEther("500")]);
    await accessAsUser.write.subscribe([1, 1]);

    await access.write.schedulePlanUpdate([
      1,
      parseEther("20000"),
      parseEther("750"),
      true,
    ]);
    await networkHelpers.time.increase(2 * 24 * 60 * 60 + 1);
    await accessAsUser.write.executePlanUpdate([1]);

    const status = await access.read.accessStatus([user.account.address]);
    assert.equal(status[0], true);
    assert.equal(status[3], parseEther("10000"));
    assert.equal(await access.read.hasAccess([user.account.address]), true);
  });

  it("blocks new purchases when a plan is disabled without revoking paid access", async function () {
    const {
      user,
      outsider,
      token,
      access,
      tokenAsUser,
      accessAsUser,
      accessAsOutsider,
    } = await deployFixture();

    await token.write.transfer([user.account.address, parseEther("10500")]);
    await tokenAsUser.write.approve([access.address, parseEther("500")]);
    await accessAsUser.write.subscribe([1, 1]);

    await access.write.schedulePlanUpdate([
      1,
      parseEther("10000"),
      parseEther("500"),
      false,
    ]);
    await networkHelpers.time.increase(2 * 24 * 60 * 60 + 1);
    await accessAsUser.write.executePlanUpdate([1]);
    assert.equal(await access.read.hasAccess([user.account.address]), true);

    await token.write.transfer([outsider.account.address, parseEther("10500")]);
    const tokenAsOutsider = await viem.getContractAt(
      "JoleriToken",
      token.address,
      { client: { public: publicClient, wallet: outsider } },
    );
    await tokenAsOutsider.write.approve([access.address, parseEther("500")]);

    await viem.assertions.revertWithCustomError(
      accessAsOutsider.write.subscribe([1, 1]),
      access,
      "JoleriAccessPlanUnavailable",
    );
  });

  it("enforces the same delay for treasury changes", async function () {
    const { newTreasury, access, accessAsOutsider } = await deployFixture();

    await access.write.scheduleTreasuryUpdate([newTreasury.account.address]);
    await viem.assertions.revertWithCustomError(
      accessAsOutsider.write.executeTreasuryUpdate(),
      access,
      "JoleriAccessConfigDelay",
    );

    await networkHelpers.time.increase(2 * 24 * 60 * 60 + 1);
    await accessAsOutsider.write.executeTreasuryUpdate();
    assert.equal(
      getAddress(await access.read.treasury()),
      getAddress(newTreasury.account.address),
    );
  });

  it("can cancel a queued treasury change", async function () {
    const { newTreasury, access, accessAsOutsider } = await deployFixture();

    await access.write.scheduleTreasuryUpdate([newTreasury.account.address]);
    await access.write.cancelTreasuryUpdate();

    await viem.assertions.revertWithCustomError(
      accessAsOutsider.write.executeTreasuryUpdate(),
      access,
      "JoleriAccessConfigNotScheduled",
    );
    await viem.assertions.revertWithCustomError(
      access.write.cancelTreasuryUpdate(),
      access,
      "JoleriAccessConfigNotScheduled",
    );
  });

  it("rejects a zero treasury update", async function () {
    const { access } = await deployFixture();

    await viem.assertions.revertWithCustomError(
      access.write.scheduleTreasuryUpdate([zeroAddress]),
      access,
      "JoleriAccessZeroAddress",
    );
  });

  it("restricts configuration and pause operations to their roles", async function () {
    const { access, accessAsOutsider } = await deployFixture();

    await viem.assertions.revertWithCustomError(
      accessAsOutsider.write.schedulePlanUpdate([1, 1n, 1n, true]),
      access,
      "AccessControlUnauthorizedAccount",
    );
    await viem.assertions.revertWithCustomError(
      accessAsOutsider.write.scheduleTreasuryUpdate([
        "0x0000000000000000000000000000000000000001",
      ]),
      access,
      "AccessControlUnauthorizedAccount",
    );
    await viem.assertions.revertWithCustomError(
      accessAsOutsider.write.pause(),
      access,
      "AccessControlUnauthorizedAccount",
    );
  });

  it("can pause new purchases without changing token balances", async function () {
    const { user, token, access, tokenAsUser, accessAsUser } =
      await deployFixture();

    await token.write.transfer([user.account.address, parseEther("10500")]);
    await tokenAsUser.write.approve([access.address, parseEther("500")]);
    await access.write.pause();

    await viem.assertions.revertWithCustomError(
      accessAsUser.write.subscribe([1, 1]),
      access,
      "EnforcedPause",
    );

    await access.write.unpause();
    await accessAsUser.write.subscribe([1, 1]);
    assert.equal(await access.read.hasAccess([user.account.address]), true);
  });
});
