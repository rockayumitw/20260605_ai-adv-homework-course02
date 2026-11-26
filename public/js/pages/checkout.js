const { createApp, ref, computed, onMounted, watch } = Vue;

createApp({
  setup() {
    if (!Auth.requireAuth()) return {};

    const loading = ref(true);
    const submitting = ref(false);
    const cartItems = ref([]);
    const form = ref({
      recipientName: '',
      recipientEmail: '',
      recipientAddress: '',
      shippingMethod: 'home',
      isRemote: false,
      isSameDay: false
    });
    const shippingFee = ref(0);
    const errors = ref({});

    const cartTotal = computed(function () {
      return cartItems.value.reduce(function (sum, item) {
        return sum + item.product.price * item.quantity;
      }, 0);
    });

    // 運費規則集中在後端 src/utils/shipping.js，前端只負責呼叫試算
    async function refreshShipping() {
      try {
        const res = await apiFetch('/api/shipping/quote', {
          method: 'POST',
          body: JSON.stringify({
            subtotal: cartTotal.value,
            shippingMethod: form.value.shippingMethod,
            isRemote: form.value.isRemote,
            isSameDay: form.value.isSameDay
          })
        });
        shippingFee.value = res.data.shippingFee;
      } catch (err) {
        Notification.show(err?.data?.message || '運費試算失敗', 'error');
      }
    }

    watch(
      function () { return [form.value.shippingMethod, form.value.isRemote, form.value.isSameDay]; },
      refreshShipping
    );

    function validate() {
      errors.value = {};
      if (!form.value.recipientName.trim()) errors.value.recipientName = '請輸入收件人姓名';
      if (!form.value.recipientEmail.trim()) {
        errors.value.recipientEmail = '請輸入 Email';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.recipientEmail)) {
        errors.value.recipientEmail = 'Email 格式不正確';
      }
      if (!form.value.recipientAddress.trim()) errors.value.recipientAddress = '請輸入收件地址';
      return Object.keys(errors.value).length === 0;
    }

    async function submitOrder() {
      if (!validate() || submitting.value) return;
      submitting.value = true;
      try {
        const res = await apiFetch('/api/orders', {
          method: 'POST',
          body: JSON.stringify(form.value)
        });
        Notification.show('訂單已建立', 'success');
        window.location.href = '/orders/' + res.data.id;
      } catch (err) {
        Notification.show(err?.data?.message || '訂單建立失敗', 'error');
      } finally {
        submitting.value = false;
      }
    }

    onMounted(async function () {
      try {
        const res = await apiFetch('/api/cart');
        cartItems.value = res.data.items;
        if (cartItems.value.length === 0) {
          window.location.href = '/cart';
          return;
        }
      } catch (e) {
        window.location.href = '/cart';
        return;
      }
      await refreshShipping();
      loading.value = false;
    });

    return { loading, submitting, cartItems, form, errors, cartTotal, shippingFee, submitOrder };
  }
}).mount('#app');
