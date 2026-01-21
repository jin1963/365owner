// ====== 365df Owner Panel CONFIG ======
window.APP_CONFIG = {
  CHAIN_ID_DEC: 56,
  CHAIN_ID_HEX: "0x38",
  CHAIN_NAME: "BSC Mainnet",

  // Tokens
  USDT: "0x55d398326f99059fF775485246999027B3197955",
  DF:   "0x36579d7eC4b29e875E3eC21A55F71C822E03A992",

  // Contracts
  STAKING: "0x8083f255ea63e1e4a6ccaa618b1584c7235b72fc",
  VAULT:   "0x1240411B0F8691968a584559E6f22CA699A0e2Be",

  // Minimal ERC20 ABI
  ERC20_ABI: [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
  ],

  // Vault ABI (จากที่คุณส่งมา) - ใช้เฉพาะที่จำเป็น
  VAULT_ABI: [
    "function owner() view returns (address)",
    "function depAutoUSDT() view returns (uint256)",
    "function withdrawDepAuto(address to, uint256 amount)",
    "function USDT() view returns (address)",
    "function DF() view returns (address)"
  ],

  // Staking ABI (จากที่คุณส่งมา) - ใช้เฉพาะที่จำเป็น
  STAKING_ABI: [
    "function owner() view returns (address)",
    "function STAKE_DAYS() view returns (uint64)",
    "function ownerWithdrawDF(address to, uint256 amount)",
    "function DF() view returns (address)"
  ]
};
