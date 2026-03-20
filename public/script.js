/* NoshProject - clean script with mini cart + HubSpot sync + n8n webhook */

(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const N8N_WEBHOOK_URL =
    "https://bdat54.app.n8n.cloud/webhook-test/3f539418-3c33-479a-912d-ed37010a1e66";

  /* =========================================================
     1) HUBSPOT FORM INSTANCE
     ========================================================= */
  let hsFormInstance = null;

  window.addEventListener("hs-form-event:on-ready", (event) => {
    try {
      if (window.HubSpotFormsV4) {
        hsFormInstance = HubSpotFormsV4.getFormFromEvent(event);
        syncCartToHubspot();
      }
    } catch (err) {
      console.warn("Không lấy được HubSpot form instance:", err);
    }
  });

  window.addEventListener("hs-form-event:on-submission:success", async (event) => {
    try {
      if (!window.HubSpotFormsV4) return;

      const form = HubSpotFormsV4.getFormFromEvent(event);
      const values = await form.getFormFieldValues();

      const normalized = {};

      values.forEach((item) => {
        const cleanName = item.name.split("/").pop();
        normalized[cleanName] = item.value;
      });

      let customerTaste = normalized.vigoi_san_pham_a_chon || "";

      if (Array.isArray(customerTaste)) {
        customerTaste = customerTaste.join(", ");
      }

      const payload = {
        firstname: normalized.firstname || "",
        lastname: normalized.lastname || "",
        email: normalized.email || "",
        phone: normalized.phone || "",
        address: normalized.address || "",
        customer_taste: customerTaste,
        voucher_code: normalized.voucher_code || "",
        order_summary: normalized.order_summary || buildOrderSummary(),
        order_total: normalized.order_total || String(getCartTotal()),
        order_item_count: normalized.order_item_count || String(getCartCount())
      };

      const resp = await fetch("/api/save-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        console.error("Lưu đơn vào backend/Knack thất bại");
        return;
      }

      cart = {};
      saveCart();
      renderCart();

      if (typeof window.showToast === "function") {
        window.showToast("Đã ghi nhận đơn hàng");
      }
    } catch (err) {
      console.error("Lỗi khi gửi đơn sang backend:", err);
    }
  });

  /* =========================================================
     2) PRODUCTS + MINI CART
     ========================================================= */
  const PRODUCTS = {
    Trial: {
      id: "Trial",
      name: "Túi Dùng Thử",
      price: 25000
    },
    Combo: {
      id: "Combo",
      name: "Combo “Ghiền Busan”",
      price: 110000
    },
    Box: {
      id: "Box",
      name: "Thùng “Tiệc Văn Phòng”",
      price: 400000
    },
    Spicy: {
      id: "Spicy",
      name: "Jagalchi vị Spicy",
      price: 25000
    },
    Peanut: {
      id: "Peanut",
      name: "Jagalchi vị Peanut",
      price: 25000
    },
    BrownRice: {
      id: "BrownRice",
      name: "Jagalchi vị Brown Rice",
      price: 25000
    },
    Chocolate: {
      id: "Chocolate",
      name: "Jagalchi vị Chocolate",
      price: 25000
    }
  };

  const CART_STORAGE_KEY = "noshproject-mini-cart";
  let cart = loadCart();

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      console.warn("Không đọc được cart từ localStorage:", err);
      return {};
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (err) {
      console.warn("Không lưu được cart:", err);
    }
  }

  function formatPrice(value) {
    return Number(value || 0).toLocaleString("vi-VN") + "đ";
  }

  function getCartEntries() {
    return Object.entries(cart).filter(([id, qty]) => PRODUCTS[id] && qty > 0);
  }

  function getCartCount() {
    return getCartEntries().reduce((sum, [, qty]) => sum + qty, 0);
  }

  function getCartTotal() {
    return getCartEntries().reduce((sum, [id, qty]) => {
      return sum + PRODUCTS[id].price * qty;
    }, 0);
  }

  function buildOrderSummary() {
    const entries = getCartEntries();
    if (!entries.length) return "";

    return entries
      .map(([id, qty]) => {
        const product = PRODUCTS[id];
        const lineTotal = product.price * qty;
        return `${product.name} x${qty} - ${lineTotal}`;
      })
      .join("; ");
  }

  function addToCart(productId) {
    if (!PRODUCTS[productId]) return;

    if (!cart[productId]) {
      cart[productId] = 1;
    } else {
      cart[productId] += 1;
    }

    saveCart();
    renderCart();
  }

  function updateQty(productId, delta) {
    if (!PRODUCTS[productId] || !cart[productId]) return;

    cart[productId] += delta;

    if (cart[productId] <= 0) {
      delete cart[productId];
    }

    saveCart();
    renderCart();
  }

  function removeItem(productId) {
    if (!cart[productId]) return;
    delete cart[productId];
    saveCart();
    renderCart();
  }

  function clearCart() {
    cart = {};
    saveCart();
    renderCart();
  }

  function syncCartToHubspot() {
    const summary = buildOrderSummary();
    const total = String(getCartTotal());
    const count = String(getCartCount());

    if (hsFormInstance && typeof hsFormInstance.setFieldValue === "function") {
      try {
        hsFormInstance.setFieldValue("order_summary", summary);
        hsFormInstance.setFieldValue("order_total", total);
        hsFormInstance.setFieldValue("order_item_count", count);
      } catch (err) {
        console.warn("Không set được hidden fields qua HubSpot API:", err);
      }
    }

    const summaryInput = $('input[name="order_summary"]');
    const totalInput = $('input[name="order_total"]');
    const countInput = $('input[name="order_item_count"]');

    if (summaryInput) summaryInput.value = summary;
    if (totalInput) totalInput.value = total;
    if (countInput) countInput.value = count;
  }

  function renderCart() {
    const cartList = $("#cartList");
    const cartEmpty = $("#cartEmpty");
    const cartCount = $("#cartCount");
    const cartTotal = $("#cartTotal");

    if (!cartList || !cartEmpty || !cartCount || !cartTotal) return;

    const entries = getCartEntries();

    if (!entries.length) {
      cartEmpty.style.display = "block";
      cartList.innerHTML = "";
      cartCount.textContent = "0";
      cartTotal.textContent = "0đ";
      syncCartToHubspot();
      return;
    }

    cartEmpty.style.display = "none";

    cartList.innerHTML = entries
      .map(([id, qty]) => {
        const product = PRODUCTS[id];
        const lineTotal = product.price * qty;

        return `
          <div class="cartItem">
            <div class="cartItem__top">
              <div>
                <div class="cartItem__name">${product.name}</div>
                <div class="cartItem__price">${formatPrice(product.price)} / gói</div>
              </div>
              <button class="cartRemove" type="button" data-action="remove" data-product="${id}">
                Xóa
              </button>
            </div>

            <div class="cartQty">
              <button type="button" data-action="decrease" data-product="${id}">−</button>
              <b>${qty}</b>
              <button type="button" data-action="increase" data-product="${id}">+</button>
              <span style="margin-left:auto;font-weight:800;">${formatPrice(lineTotal)}</span>
            </div>
          </div>
        `;
      })
      .join("");

    cartCount.textContent = String(getCartCount());
    cartTotal.textContent = formatPrice(getCartTotal());

    syncCartToHubspot();
  }

  /* =========================================================
     3) DOM READY
     ========================================================= */
  function init() {
    /* -------------------------
       Mobile nav
    ------------------------- */
    const navToggle = $("#navToggle");
    const navMenu = $("#navMenu");

    if (navToggle && navMenu) {
      navToggle.addEventListener("click", () => {
        const isOpen = navMenu.classList.toggle("is-open");
        navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });

      $$("#navMenu a").forEach((link) => {
        link.addEventListener("click", () => {
          navMenu.classList.remove("is-open");
          navToggle.setAttribute("aria-expanded", "false");
        });
      });
    }

    /* -------------------------
       Countdown + stock
    ------------------------- */
    let seconds = 15 * 60;
    let stock = 37;
    let tick = 0;

    const stockLeft = $("#stockLeft");
    const stockInline = $("#stockInline");
    const stockSticky = $("#stockSticky");
    const countdown = $("#countdown");
    const countdownInline = $("#countdownInline");
    const countdownSticky = $("#countdownSticky");

    function formatTime(totalSeconds) {
      const mins = Math.floor(totalSeconds / 60)
        .toString()
        .padStart(2, "0");
      const secs = Math.floor(totalSeconds % 60)
        .toString()
        .padStart(2, "0");
      return `${mins}:${secs}`;
    }

    function renderUrgency() {
      const timeText = formatTime(seconds);

      if (countdown) countdown.textContent = timeText;
      if (countdownInline) countdownInline.textContent = timeText;
      if (countdownSticky) countdownSticky.textContent = timeText;

      if (stockLeft) stockLeft.textContent = String(stock);
      if (stockInline) stockInline.textContent = String(stock);
      if (stockSticky) stockSticky.textContent = String(stock);
    }

    renderUrgency();

    setInterval(() => {
      seconds = Math.max(0, seconds - 1);
      tick += 1;

      if (tick % 90 === 0 && stock > 7) {
        stock -= 1;
      }

      renderUrgency();
    }, 1000);

    /* -------------------------
       Flavor buttons
    ------------------------- */
    $$(".mini").forEach((btn) => {
      btn.addEventListener("click", () => {
        window.showToast("Bạn đang xem hương vị sản phẩm");
      });
    });

    /* -------------------------
       Global toast
    ------------------------- */
    function showToast(message = "Đã thêm vào giỏ hàng") {
      const toast = document.getElementById("toast");
      if (!toast) return;

      toast.textContent = message;
      toast.classList.add("show");

      clearTimeout(toast._timer);
      toast._timer = setTimeout(() => {
        toast.classList.remove("show");
      }, 1800);
    }

    window.showToast = showToast;

    /* -------------------------
       Add to cart buttons
    ------------------------- */
    $$(".add-to-cart").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        const productId = btn.dataset.product;
        addToCart(productId);
        showToast("Đã thêm sản phẩm vào giỏ hàng");
      });
    });

    /* -------------------------
       Cart actions
    ------------------------- */
    const cartList = $("#cartList");
    if (cartList) {
      cartList.addEventListener("click", (event) => {
        const target = event.target.closest("button[data-action][data-product]");
        if (!target) return;

        const action = target.dataset.action;
        const productId = target.dataset.product;

        if (action === "increase") updateQty(productId, 1);
        if (action === "decrease") updateQty(productId, -1);
        if (action === "remove") removeItem(productId);
      });
    }

    const clearCartBtn = $("#clearCartBtn");
    if (clearCartBtn) {
      clearCartBtn.addEventListener("click", clearCart);
    }

    renderCart();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.getCartEntries = getCartEntries;
  window.getCartCount = getCartCount;
  window.getCartTotal = getCartTotal;
  window.buildOrderSummary = buildOrderSummary;
  window.PRODUCTS = PRODUCTS;
  window.clearCart = clearCart;
  window.formatPrice = formatPrice;
})();

/* =========================================================
   4) ORDER FLOW OUTSIDE IIFE
   ========================================================= */

function getSafeCartEntries() {
  return typeof window.getCartEntries === "function" ? window.getCartEntries() : [];
}

function getSafeCartCount() {
  return typeof window.getCartCount === "function" ? window.getCartCount() : 0;
}

function getSafeCartTotal() {
  return typeof window.getCartTotal === "function" ? window.getCartTotal() : 0;
}

function buildSafeOrderSummary() {
  return typeof window.buildOrderSummary === "function" ? window.buildOrderSummary() : "";
}

function formatSafePrice(value) {
  return typeof window.formatPrice === "function"
    ? window.formatPrice(value)
    : Number(value || 0).toLocaleString("vi-VN") + "đ";
}

async function postJson(url, payload, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const text = await res.text().catch(() => "");
    let data = {};
    
    // Safely parse JSON
    if (text && text.trim()) {
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.warn("⚠️ JSON parse error. Raw response:", text.substring(0, 200));
        data = { raw: text };
      }
    }

    if (!res.ok) {
      console.error(`❌ HTTP Error ${res.status}: ${res.statusText}. Response:`, text.substring(0, 500));
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function sendOrderToN8N(payload) {
  console.log("📤 Gửi data tới n8n:", payload);
  return postJson(N8N_WEBHOOK_URL, payload, 20000);
}

// HELPER: Submit order to backend + n8n
async function submitOrder(formData, retryCount = 0) {
  const payload = {
    ho: formData.ho,
    ten: formData.ten,
    email: formData.email,
    phone: formData.phone,
    address: formData.address,
    preferences: formData.preferences,
    consent_email: formData.consent_email ? "Yes" : "No",
    order_summary: buildSafeOrderSummary(),
    order_total: String(getSafeCartTotal()),
    order_item_count: String(getSafeCartCount()),
    source: "final-landing-page"
  };

  console.log(`📤 Gửi data (attempt ${retryCount + 1}/3):`, payload);

  try {
    const results = await Promise.allSettled([
      postJson("/api/save-order", payload, 15000),
      sendOrderToN8N(payload)
    ]);

    const backendResult = results[0];
    const n8nResult = results[1];

    console.log("📡 Backend result:", backendResult);
    console.log("📡 n8n result:", n8nResult);

    const hasSuccess =
      backendResult.status === "fulfilled" || n8nResult.status === "fulfilled";

    if (!hasSuccess) {
      throw new Error("Cả backend và n8n đều thất bại");
    }

    if (typeof window.showToast === "function") {
      window.showToast("✅ Đơn hàng đã được gửi thành công!");
    }

    return {
      backend:
        backendResult.status === "fulfilled" ? backendResult.value : null,
      n8n:
        n8nResult.status === "fulfilled" ? n8nResult.value : null
    };
  } catch (err) {
    console.error(`❌ Attempt ${retryCount + 1} failed:`, err.message);

    if (
      retryCount < 2 &&
      (err.message.includes("Failed to fetch") || err.name === "AbortError")
    ) {
      console.log("⏳ Retrying in 1 second...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return submitOrder(formData, retryCount + 1);
    }

    if (typeof window.showToast === "function") {
      window.showToast("⚠️ Lỗi khi gửi đơn hàng. Vui lòng thử lại");
    }

    throw err;
  }
}

// STEP 1: Submit form -> validate -> show confirmation
function bindOrderForm() {
  const orderForm = document.getElementById("noshOrderForm");
  if (!orderForm) return;

  orderForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const cartEntries = getSafeCartEntries();
    if (cartEntries.length === 0) {
      if (typeof window.showToast === "function") {
        window.showToast("❌ Vui lòng chọn ít nhất một sản phẩm");
      }
      return;
    }

    const selectedFlavors = Array.from(
      document.querySelectorAll('input[name="pref"]:checked')
    ).map((el) => el.value);

    if (selectedFlavors.length === 0) {
      if (typeof window.showToast === "function") {
        window.showToast("❌ Vui lòng chọn ít nhất một hương vị yêu thích");
      }
      return;
    }

    const formData = {
      ho: document.getElementById("ho")?.value.trim() || "",
      ten: document.getElementById("ten")?.value.trim() || "",
      email: document.getElementById("email")?.value.trim() || "",
      phone: document.getElementById("phone")?.value.trim() || "",
      address: document.getElementById("address")?.value.trim() || "",
      preferences: selectedFlavors.join(", "),
      consent_email: document.getElementById("consent_email")?.checked || false,
      source: "Website"
    };

    if (
      !formData.ho ||
      !formData.ten ||
      !formData.email ||
      !formData.phone ||
      !formData.address
    ) {
      if (typeof window.showToast === "function") {
        window.showToast("❌ Vui lòng điền đầy đủ thông tin cá nhân");
      }
      return;
    }

    window._orderData = formData;
    showConfirmationScreen(formData);
  });
}

// STEP 2: Hiện màn hình xác nhận
function showConfirmationScreen(formData) {
  const form = document.getElementById("noshOrderForm");
  const confirmationScreen = document.getElementById("confirmationScreen");

  if (!form || !confirmationScreen) return;

  form.style.display = "none";
  confirmationScreen.style.display = "block";

  const customerInfo = document.getElementById("confirmCustomerInfo");
  if (customerInfo) {
    customerInfo.innerHTML = `
      <div><strong>Họ & tên:</strong> ${formData.ho} ${formData.ten}</div>
      <div><strong>Email:</strong> ${formData.email}</div>
      <div><strong>Số điện thoại:</strong> ${formData.phone}</div>
      <div><strong>Địa chỉ giao hàng:</strong> ${formData.address}</div>
    `;
  }

  const confirmOrderItems = document.getElementById("confirmOrderItems");
  if (confirmOrderItems) {
    const entries = getSafeCartEntries();
    if (entries.length > 0) {
      confirmOrderItems.innerHTML = entries
        .map(([id, qty]) => {
          const product = window.PRODUCTS[id];
          const lineTotal = product.price * qty;
          return `<div>${product.name} x${qty} <span>${formatSafePrice(lineTotal)}</span></div>`;
        })
        .join("");
    } else {
      confirmOrderItems.innerHTML = "<div>Không có sản phẩm nào</div>";
    }
  }

  const confirmOrderTotal = document.getElementById("confirmOrderTotal");
  if (confirmOrderTotal) {
    const total = getSafeCartTotal();
    confirmOrderTotal.innerHTML = `<div style="font-size: 18px; font-weight: 700;"><span style="color: var(--orange);">${formatSafePrice(
      total
    )}</span></div>`;
  }

  const confirmFlavors = document.getElementById("confirmFlavors");
  if (confirmFlavors) {
    const flavorsText = formData.preferences || "Chưa chọn vị";
    confirmFlavors.innerHTML = `<div>${flavorsText}</div>`;
  }

  confirmationScreen.scrollIntoView({ behavior: "smooth", block: "start" });
}

// STEP 2.5 + STEP 3
function bindGlobalClicks() {
  document.addEventListener("click", async function (e) {
    if (e.target.id === "backBtn") {
      const form = document.getElementById("noshOrderForm");
      const confirmationScreen = document.getElementById("confirmationScreen");

      if (form && confirmationScreen) {
        confirmationScreen.style.display = "none";
        form.style.display = "block";
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    if (e.target.id === "continueShoppingBtn") {
      const form = document.getElementById("noshOrderForm");
      const thankYouScreen = document.getElementById("thankYouScreen");

      if (form && thankYouScreen) {
        thankYouScreen.style.display = "none";
        form.style.display = "block";
        form.reset();
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    if (e.target.id === "confirmBtn") {
      console.log("🔵 Nút confirm được click");

      const formData = window._orderData;
      if (!formData) {
        console.error("❌ Không có formData");
        return;
      }

      console.log("📝 Form data:", formData);

      try {
        console.log("⏳ Đang gửi đơn hàng tới backend + n8n...");
        await submitOrder(formData);
        console.log("✅ Gửi đơn hàng thành công");
      } catch (err) {
        console.error("❌ Lỗi khi gửi đơn hàng:", err);
      }

      console.log("🎉 Hiện thank you screen");
      showThankYouScreen(formData);
    }
  });
}

// STEP 4: Hiện màn hình cảm ơn
function showThankYouScreen(formData) {
  const confirmationScreen = document.getElementById("confirmationScreen");
  const thankYouScreen = document.getElementById("thankYouScreen");
  const thankYouOrderNumber = document.getElementById("thankYouOrderNumber");

  if (!confirmationScreen || !thankYouScreen) return;

  confirmationScreen.style.display = "none";
  thankYouScreen.style.display = "block";

  const orderNumber = "JAGAL" + Date.now().toString().slice(-8);

  if (thankYouOrderNumber) {
    thankYouOrderNumber.innerHTML = `
      <strong style="font-size: 14px; color: var(--muted);">Mã đơn hàng:</strong>
      <span style="font-family: monospace; font-weight: 700; color: var(--orange); font-size: 14px;">${orderNumber}</span>
    `;
  }

  if (typeof window.clearCart === "function") {
    window.clearCart();
  }

  const form = document.getElementById("noshOrderForm");
  if (form) form.reset();

  thankYouScreen.scrollIntoView({ behavior: "smooth", block: "start" });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    bindOrderForm();
    bindGlobalClicks();
  });
} else {
  bindOrderForm();
  bindGlobalClicks();
}