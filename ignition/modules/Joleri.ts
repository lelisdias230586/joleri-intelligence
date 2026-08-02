import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const UNIT = 10n ** 18n;

const ECOSYSTEM_ALLOCATION = 35_000_000n * UNIT;
const TREASURY_ALLOCATION = 20_000_000n * UNIT;
const LIQUIDITY_ALLOCATION = 15_000_000n * UNIT;
const TEAM_ALLOCATION = 15_000_000n * UNIT;
const PARTNERS_ALLOCATION = 10_000_000n * UNIT;
const SECURITY_ALLOCATION = 5_000_000n * UNIT;

const TEAM_DURATION = 3n * 365n * 24n * 60n * 60n;
const TEAM_CLIFF = 365n * 24n * 60n * 60n;
const PARTNERS_DURATION = 2n * 365n * 24n * 60n * 60n;
const PARTNERS_CLIFF = 180n * 24n * 60n * 60n;

export default buildModule("JoleriModule", (m) => {
  const deployer = m.getAccount(0);

  // All parameters default to the deployer for safe local testing. Public
  // deployments must provide separate multisig and beneficiary addresses.
  const admin = m.getParameter("admin", deployer);
  const ecosystemWallet = m.getParameter("ecosystemWallet", deployer);
  const treasuryWallet = m.getParameter("treasuryWallet", deployer);
  const liquidityWallet = m.getParameter("liquidityWallet", deployer);
  const teamBeneficiary = m.getParameter("teamBeneficiary", deployer);
  const partnersBeneficiary = m.getParameter("partnersBeneficiary", deployer);
  const securityWallet = m.getParameter("securityWallet", deployer);

  const token = m.contract("JoleriToken", [admin, deployer]);

  const teamVesting = m.contract(
    "JoleriVestingWallet",
    [teamBeneficiary, TEAM_DURATION, TEAM_CLIFF],
    { id: "JoleriTeamVesting" },
  );
  const partnersVesting = m.contract(
    "JoleriVestingWallet",
    [partnersBeneficiary, PARTNERS_DURATION, PARTNERS_CLIFF],
    { id: "JoleriPartnersVesting" },
  );

  const access = m.contract("JoleriAccess", [
    token,
    treasuryWallet,
    admin,
  ]);

  m.call(token, "transfer", [ecosystemWallet, ECOSYSTEM_ALLOCATION], {
    id: "AllocateEcosystem",
  });
  m.call(token, "transfer", [treasuryWallet, TREASURY_ALLOCATION], {
    id: "AllocateTreasury",
  });
  m.call(token, "transfer", [liquidityWallet, LIQUIDITY_ALLOCATION], {
    id: "AllocateLiquidity",
  });
  m.call(token, "transfer", [teamVesting, TEAM_ALLOCATION], {
    id: "AllocateTeamVesting",
  });
  m.call(token, "transfer", [partnersVesting, PARTNERS_ALLOCATION], {
    id: "AllocatePartnersVesting",
  });
  m.call(token, "transfer", [securityWallet, SECURITY_ALLOCATION], {
    id: "AllocateSecurity",
  });

  return { token, access, teamVesting, partnersVesting };
});
