(() => {
  const C = window.APP_CONFIG;
  const $ = (id) => document.getElementById(id);

  let provider, signer, account;
  let usdt, df, vault, staking;
  let usdtDec = 18, dfDec = 18, usdtSym = "USDT", dfSym = "DF";

  const setStatus = (msg, type="") => {
    const el = $("status");
    el.textContent = msg;
    el.className = "status " + (type || "");
  };

  const short = (addr) => addr ? addr.slice(0,6) + "…" + addr.slice(-4) : "-";

  async function ensureProvider() {
    if (!window.ethereum) throw new Error("ไม่พบ Wallet Provider (window.ethereum). เปิดใน MetaMask/Bitget/Binance DApp Browser");
    provider = new ethers.providers.Web3Provider(window.ethereum, "any");
  }

  async function connect() {
    try {
      setStatus("กำลังเชื่อมต่อ…", "warn");
      await ensureProvider();

      // ขอ account
      const accs = await provider.send("eth_requestAccounts", []);
      account = ethers.utils.getAddress(accs[0]);
      signer = provider.getSigner();

      // ตรวจ chain
      const net = await provider.getNetwork();
      $("network").textContent = `${net.chainId}`;
      if (net.chainId !== C.CHAIN_ID_DEC) {
        setStatus(`ตอนนี้อยู่ chainId=${net.chainId} กรุณาสลับเป็น BSC (56)`, "bad");
      }

      // init contracts
      usdt = new ethers.Contract(C.USDT, C.ERC20_ABI, signer);
      df   = new ethers.Contract(C.DF,   C.ERC20_ABI, signer);
      vault   = new ethers.Contract(C.VAULT,   C.VAULT_ABI, signer);
      staking = new ethers.Contract(C.STAKING, C.STAKING_ABI, signer);

      // load decimals/symbol
      [usdtDec, dfDec, usdtSym, dfSym] = await Promise.all([
        usdt.decimals(), df.decimals(),
        usdt.symbol().catch(()=> "USDT"),
        df.symbol().catch(()=> "DF"),
      ]);

      $("wallet").textContent = account;

      $("contractsLine").textContent =
        `USDT ${short(C.USDT)} • DF ${short(C.DF)} • Vault ${short(C.VAULT)} • Staking ${short(C.STAKING)}`;

      // owners
      const [ownV, ownS] = await Promise.all([vault.owner(), staking.owner()]);
      $("ownerVault").textContent = ownV;
      $("ownerStaking").textContent = ownS;

      // enable buttons
      $("btnWithdrawDepAuto").disabled = false;
      $("btnOwnerWithdrawDF").disabled = false;
      $("btnRefreshVault").disabled = false;
      $("btnRefreshStaking").disabled = false;

      // refresh data
      await refreshAll();

      setStatus("เชื่อมต่อสำเร็จ ✅", "ok");
    } catch (e) {
      console.error(e);
      setStatus(e?.message || "เชื่อมต่อไม่สำเร็จ", "bad");
    }
  }

  function fmt(amount, dec) {
    try { return ethers.utils.formatUnits(amount, dec); }
    catch { return String(amount); }
  }

  async function refreshVault() {
    if (!vault) return;
    const [balUSDT, balDF, depAuto] = await Promise.all([
      usdt.balanceOf(C.VAULT),
      df.balanceOf(C.VAULT),
      vault.depAutoUSDT()
    ]);

    $("kpiVaultUSDT").textContent = `${fmt(balUSDT, usdtDec)} ${usdtSym}`;
    $("kpiVaultDF").textContent   = `${fmt(balDF, dfDec)} ${dfSym}`;
    $("kpiDepAuto").textContent   = `${fmt(depAuto, usdtDec)} ${usdtSym}`;
    $("kpiDecimals").textContent  = `${usdtDec} / ${dfDec}`;
  }

  async function refreshStaking() {
    if (!staking) return;
    const [balDF, stakeDays] = await Promise.all([
      df.balanceOf(C.STAKING),
      staking.STAKE_DAYS()
    ]);

    $("kpiStakingDF").textContent = `${fmt(balDF, dfDec)} ${dfSym}`;
    $("kpiStakeDays").textContent = String(stakeDays);
  }

  async function refreshAll() {
    try {
      setStatus("กำลังโหลดข้อมูล…", "warn");
      await Promise.all([refreshVault(), refreshStaking()]);
      setStatus("อัปเดตข้อมูลแล้ว ✅", "ok");
    } catch (e) {
      console.error(e);
      setStatus(e?.message || "โหลดข้อมูลไม่สำเร็จ", "bad");
    }
  }

  async function withdrawDepAuto() {
    try {
      if (!vault) throw new Error("ยังไม่เชื่อมต่อ");
      const to = ($("wdToUSDT").value || "").trim();
      const amt = ($("wdAmtUSDT").value || "").trim();
      if (!ethers.utils.isAddress(to)) throw new Error("ปลายทาง to ไม่ถูกต้อง");
      if (!amt || Number(amt) <= 0) throw new Error("amount ต้องมากกว่า 0");

      // owner check (กันพลาด)
      const own = await vault.owner();
      if (own.toLowerCase() !== account.toLowerCase()) {
        throw new Error(`กระเป๋านี้ไม่ใช่ owner ของ Vault (owner คือ ${own})`);
      }

      const amountWei = ethers.utils.parseUnits(amt, usdtDec);

      setStatus("กำลังส่งธุรกรรมถอน depAutoUSDT…", "warn");
      const tx = await vault.withdrawDepAuto(to, amountWei);
      setStatus(`ส่งแล้ว รอยืนยัน… tx=${tx.hash}`, "warn");
      await tx.wait();

      setStatus("ถอน depAutoUSDT สำเร็จ ✅", "ok");
      await refreshVault();
    } catch (e) {
      console.error(e);
      setStatus(e?.reason || e?.message || "ถอนล้มเหลว", "bad");
    }
  }

  async function ownerWithdrawDF() {
    try {
      if (!staking) throw new Error("ยังไม่เชื่อมต่อ");
      const to = ($("wdToDF").value || "").trim();
      const amt = ($("wdAmtDF").value || "").trim();
      if (!ethers.utils.isAddress(to)) throw new Error("ปลายทาง to ไม่ถูกต้อง");
      if (!amt || Number(amt) <= 0) throw new Error("amount ต้องมากกว่า 0");

      // owner check
      const own = await staking.owner();
      if (own.toLowerCase() !== account.toLowerCase()) {
        throw new Error(`กระเป๋านี้ไม่ใช่ owner ของ Staking (owner คือ ${own})`);
      }

      const amountWei = ethers.utils.parseUnits(amt, dfDec);

      setStatus("กำลังส่งธุรกรรมถอน DF จาก Staking…", "warn");
      const tx = await staking.ownerWithdrawDF(to, amountWei);
      setStatus(`ส่งแล้ว รอยืนยัน… tx=${tx.hash}`, "warn");
      await tx.wait();

      setStatus("ถอน DF จาก Staking สำเร็จ ✅", "ok");
      await refreshStaking();
    } catch (e) {
      console.error(e);
      setStatus(e?.reason || e?.message || "ถอนล้มเหลว", "bad");
    }
  }

  // Events
  window.addEventListener("load", () => {
    $("btnConnect").addEventListener("click", connect);
    $("btnRefreshVault").addEventListener("click", refreshVault);
    $("btnRefreshStaking").addEventListener("click", refreshStaking);
    $("btnWithdrawDepAuto").addEventListener("click", withdrawDepAuto);
    $("btnOwnerWithdrawDF").addEventListener("click", ownerWithdrawDF);

    // ถ้ามี provider ให้ auto refresh ตอนเปลี่ยน account/chain
    if (window.ethereum) {
      window.ethereum.on?.("accountsChanged", () => location.reload());
      window.ethereum.on?.("chainChanged", () => location.reload());
    }

    setStatus("Ready");
  });
})();
