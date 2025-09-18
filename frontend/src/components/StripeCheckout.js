import React, { useState } from 'react';
import { X, CreditCard, Lock } from 'lucide-react';

const StripeCheckout = ({ service, appointment, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    storeInfo: false
  });
  
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Sample coupon codes
  const coupons = {
    'SAVE10': { discount: 10, type: 'percentage' },
    'FIRST20': { discount: 20, type: 'fixed' },
    'HEALTH15': { discount: 15, type: 'percentage' }
  };

  const calculateTotal = () => {
    let total = service.price;
    if (appliedCoupon) {
      if (appliedCoupon.type === 'percentage') {
        total = total * (1 - appliedCoupon.discount / 100);
      } else {
        total = Math.max(0, total - appliedCoupon.discount);
      }
    }
    return total.toFixed(2);
  };

  const handleApplyCoupon = () => {
    if (coupons[couponCode.toUpperCase()]) {
      setAppliedCoupon(coupons[couponCode.toUpperCase()]);
    } else {
      alert('Invalid coupon code');
    }
  };

  const handleSubmit = async () => {
    setIsProcessing(true);

    // Simulate payment processing - replace with actual Stripe integration
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess({
        service,
        appointment,
        payment: {
          amount: calculateTotal(),
          method: 'card'
        },
        customer: formData
      });
    }, 2000);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-green-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-white bg-opacity-20 rounded-full p-1">
              <span className="text-sm font-bold">1</span>
            </div>
            <span className="text-sm">Checkout</span>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Service Summary */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">{service.title}</h2>
            <p className="text-sm text-gray-600 mb-2">{service.provider}</p>
            <p className="text-sm text-gray-600">
              {appointment.date}, {appointment.time}
            </p>
          </div>

          {/* Coupon Section */}
          <div className="mb-6">
            <h3 className="font-medium mb-2">Have a coupon code?</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Enter Code"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={handleApplyCoupon}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Apply
              </button>
            </div>
            {appliedCoupon && (
              <p className="text-green-600 text-sm mt-1">
                Coupon applied: {appliedCoupon.type === 'percentage' ? `${appliedCoupon.discount}% off` : `$${appliedCoupon.discount} off`}
              </p>
            )}
          </div>

          {/* Pricing */}
          <div className="mb-6 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>${service.price.toFixed(2)}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-${(service.price - parseFloat(calculateTotal())).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>${calculateTotal()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Due now</span>
              <span>${calculateTotal()}</span>
            </div>
          </div>

          {/* Customer Details */}
          <div className="mb-6">
            <h3 className="font-medium mb-4">Add your details</h3>
            <p className="text-sm text-gray-600 mb-4">
              Already have an account? <button type="button" className="text-green-600 underline">Sign In</button>
            </p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.storeInfo}
                  onChange={(e) => handleInputChange('storeInfo', e.target.checked)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-600">
                  Store my information for faster checkout in the future.
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                By signing up, you may receive exclusive promotions by email.
              </p>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <h3 className="font-medium mb-3">Payment Method</h3>
            <div className="border border-gray-300 rounded-md p-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium">Credit/Debit Card</span>
              </div>
              
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="1234 1234 1234 1234"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="MM/YY"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="text"
                    placeholder="CVC"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
              <Lock className="w-3 h-3" />
              <span>Your payment information is secure and encrypted</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              isProcessing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            } text-white`}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </div>
            ) : (
              `Complete Payment - $${calculateTotal()}`
            )}
          </button>

          <p className="text-xs text-gray-500 mt-3 text-center">
            By completing your purchase, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StripeCheckout;
