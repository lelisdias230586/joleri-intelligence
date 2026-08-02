import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther, zeroAddress } from "viem";

describe("JoleriToken", async function () {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();

  async function deployFixture() {
    const [admin, recipient, user] = await viem.getWalletClients();
    const token = await viem.deployContract("JoleriToken", [
      admin.account.address,
      recipient.account.address,
    ]);

    const tokenAsRecipient = await viem.getContractAt(
      "JoleriToken",
      token.address,
      { client: { public: publicClient, wallet: recipient } },
    );
    const tokenAsUser = await viem.getContractAt("JoleriToken", token.address, {
      client: { public: publicClient, wallet: user },
    });

    return { admin, recipient, user, token, tokenAsRecipient, tokenAsUser };
  }

  it("mints the fixed 100 million supply exactly once", async function () {
    const { recipient, token } = await deployFixture();
    const expectedSupply = parseEther("100000000");

    assert.equal(await token.read.name(), "Joleri Intelligence");
    assert.equal(await token.read.symbol(), "JOLR");
    assert.equal(await token.read.decimals(), 18);
    assert.equal(await token.read.MAX_SUPPLY(), expectedSupply);
    assert.equal(await token.read.totalSupply(), expectedSupply);
    assert.equal(
      await token.read.balanceOf([recipient.account.address]),
      expectedSupply,
    );

    const exposesMint = token.abi.some(
      (entry) =>
        entry.type === "function" && (entry.name as string) === "mint",
    );
    assert.equal(exposesMint, false);
  });

  it("has no transfer tax and allows voluntary burning", async function () {
    const { user, token, tokenAsRecipient } = await deployFixture();
    const transferAmount = parseEther("1000");
    const burnAmount = parseEther("250");

    await tokenAsRecipient.write.transfer([user.account.address, transferAmount]);
    assert.equal(
      await token.read.balanceOf([user.account.address]),
      transferAmount,
    );

    const initialSupply = await token.read.totalSupply();
    const tokenAsUser = await viem.getContractAt("JoleriToken", token.address, {
      client: {
        public: publicClient,
        wallet: await viem.getWalletClient(user.account.address),
      },
    });
    await tokenAsUser.write.burn([burnAmount]);

    assert.equal(
      await token.read.totalSupply(),
      initialSupply - burnAmount,
    );
    assert.equal(
      await token.read.balanceOf([user.account.address]),
      transferAmount - burnAmount,
    );
  });

  it("allows only the pauser role to stop and resume transfers", async function () {
    const { user, token, tokenAsRecipient, tokenAsUser } = await deployFixture();

    await viem.assertions.revertWithCustomError(
      tokenAsUser.write.pause(),
      token,
      "AccessControlUnauthorizedAccount",
    );

    await token.write.pause();
    assert.equal(await token.read.paused(), true);

    await viem.assertions.revertWithCustomError(
      tokenAsUser.write.unpause(),
      token,
      "AccessControlUnauthorizedAccount",
    );

    await viem.assertions.revertWithCustomError(
      tokenAsRecipient.write.transfer([user.account.address, 1n]),
      token,
      "EnforcedPause",
    );

    await token.write.unpause();
    await tokenAsRecipient.write.transfer([user.account.address, 1n]);
    assert.equal(await token.read.balanceOf([user.account.address]), 1n);
  });

  it("rejects a zero initial supply recipient", async function () {
    const { admin, token } = await deployFixture();

    await viem.assertions.revertWithCustomError(
      viem.deployContract("JoleriToken", [admin.account.address, zeroAddress]),
      token,
      "JoleriTokenZeroAddress",
    );
  });

  it("supports EIP-2612 permit metadata", async function () {
    const { recipient, token } = await deployFixture();

    assert.equal(await token.read.nonces([recipient.account.address]), 0n);
    assert.notEqual(
      await token.read.DOMAIN_SEPARATOR(),
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    );
  });
});
