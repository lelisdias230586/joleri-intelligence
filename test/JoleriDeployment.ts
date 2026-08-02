import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { getAddress, parseEther } from "viem";

import JoleriModule from "../ignition/modules/Joleri.js";

describe("Joleri deployment module", async function () {
  const { viem, ignition } = await network.create();

  it("distributes the full supply and configures production roles", async function () {
    const [
      deployer,
      admin,
      ecosystem,
      treasury,
      liquidity,
      team,
      partners,
      security,
    ] = await viem.getWalletClients();

    const { token, access, teamVesting, partnersVesting } =
      await ignition.deploy(JoleriModule, {
        displayUi: false,
        parameters: {
          JoleriModule: {
            admin: admin.account.address,
            ecosystemWallet: ecosystem.account.address,
            treasuryWallet: treasury.account.address,
            liquidityWallet: liquidity.account.address,
            teamBeneficiary: team.account.address,
            partnersBeneficiary: partners.account.address,
            securityWallet: security.account.address,
          },
        },
      });

    const expectedBalances = new Map([
      [ecosystem.account.address, parseEther("35000000")],
      [treasury.account.address, parseEther("20000000")],
      [liquidity.account.address, parseEther("15000000")],
      [teamVesting.address, parseEther("15000000")],
      [partnersVesting.address, parseEther("10000000")],
      [security.account.address, parseEther("5000000")],
    ]);

    for (const [account, expectedBalance] of expectedBalances) {
      assert.equal(await token.read.balanceOf([account]), expectedBalance);
    }
    assert.equal(await token.read.balanceOf([deployer.account.address]), 0n);
    assert.equal(await token.read.totalSupply(), parseEther("100000000"));

    assert.equal(
      getAddress(await token.read.defaultAdmin()),
      getAddress(admin.account.address),
    );
    assert.equal(
      getAddress(await access.read.defaultAdmin()),
      getAddress(admin.account.address),
    );
    assert.equal(
      getAddress(await access.read.treasury()),
      getAddress(treasury.account.address),
    );
    assert.equal(
      getAddress(await teamVesting.read.owner()),
      getAddress(team.account.address),
    );
    assert.equal(
      getAddress(await partnersVesting.read.owner()),
      getAddress(partners.account.address),
    );

    assert.equal(await teamVesting.read.duration(), 3n * 365n * 24n * 60n * 60n);
    assert.equal(
      (await teamVesting.read.cliff()) - (await teamVesting.read.start()),
      365n * 24n * 60n * 60n,
    );
    assert.equal(
      await partnersVesting.read.duration(),
      2n * 365n * 24n * 60n * 60n,
    );
    assert.equal(
      (await partnersVesting.read.cliff()) -
        (await partnersVesting.read.start()),
      180n * 24n * 60n * 60n,
    );
  });
});
