let razorpayCheckoutPromise = null;

export const loadRazorpayCheckout = async () => {
  if (typeof window === "undefined") {
    throw new Error("Razorpay checkout is only available in the browser");
  }

  if (window.Razorpay) {
    return window.Razorpay;
  }

  if (razorpayCheckoutPromise) {
    return razorpayCheckoutPromise;
  }

  razorpayCheckoutPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[data-razorpay-checkout="true"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.Razorpay), {
        once: true,
      });
      existingScript.addEventListener(
        "error",
        () => {
          razorpayCheckoutPromise = null;
          reject(new Error("Failed to load Razorpay Checkout"));
        },
        {
          once: true,
        },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpayCheckout = "true";
    script.onload = () => {
      if (window.Razorpay) {
        resolve(window.Razorpay);
        return;
      }

      razorpayCheckoutPromise = null;
      reject(new Error("Razorpay Checkout did not initialize"));
    };
    script.onerror = () => {
      razorpayCheckoutPromise = null;
      reject(new Error("Failed to load Razorpay Checkout"));
    };
    document.body.appendChild(script);
  });

  return razorpayCheckoutPromise;
};

export default loadRazorpayCheckout;
