"use client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function AddNewCardPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    cardNumber: "",
    cardholderName: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    isDefault: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log("Adding new card...", formData);
    router.push("/billing");
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Add New Card" />
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:p-10">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-semibold text-gray-900 dark:text-white">
              Add New Payment Method
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Add a new credit or debit card to your account for seamless
              payments.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Card Preview */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 p-8 text-white">
              <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
              <div className="relative">
                <div className="mb-6 flex items-center justify-between">
                  <div className="text-sm font-medium opacity-80">Card Number</div>
                  <div className="text-sm font-medium opacity-80">
                    {formData.expiryMonth && formData.expiryYear
                      ? `${formData.expiryMonth}/${formData.expiryYear}`
                      : "MM/YY"}
                  </div>
                </div>
                <div className="mb-6 text-2xl font-semibold tracking-wider">
                  {formData.cardNumber || "•••• •••• •••• ••••"}
                </div>
                <div className="text-sm font-medium">
                  {formData.cardholderName || "CARDHOLDER NAME"}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                type="text"
                defaultValue={formData.cardNumber}
                onChange={(e) =>
                  handleChange("cardNumber", formatCardNumber(e.target.value))
                }
                placeholder="1234 5678 9012 3456"
              />
            </div>

            <div>
              <Label htmlFor="cardholderName">Cardholder Name</Label>
              <Input
                id="cardholderName"
                type="text"
                defaultValue={formData.cardholderName}
                onChange={(e) =>
                  handleChange("cardholderName", e.target.value.toUpperCase())
                }
                placeholder="JANE SMITH"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="expiryMonth">Expiry Month</Label>
                <div className="relative">
                  <select
                    id="expiryMonth"
                    value={formData.expiryMonth}
                    onChange={(e) => handleChange("expiryMonth", e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 pr-10 text-sm text-gray-800 focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
                  >
                    <option value="">MM</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <option key={month} value={String(month).padStart(2, "0")}>
                        {String(month).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="expiryYear">Expiry Year</Label>
                <div className="relative">
                  <select
                    id="expiryYear"
                    value={formData.expiryYear}
                    onChange={(e) => handleChange("expiryYear", e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 pr-10 text-sm text-gray-800 focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
                  >
                    <option value="">YY</option>
                    {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() + i).map(
                      (year) => (
                        <option key={year} value={String(year).slice(-2)}>
                          {String(year).slice(-2)}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  type="text"
                  defaultValue={formData.cvv}
                  onChange={(e) =>
                    handleChange("cvv", e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder="123"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => handleChange("isDefault", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <Label htmlFor="isDefault" className="mb-0 cursor-pointer">
                Set as default payment method
              </Label>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Your card information is encrypted and secure. We use industry-standard
                SSL encryption to protect your data.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => router.push("/billing")}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                className="w-full sm:w-auto"
                disabled={
                  !formData.cardNumber ||
                  !formData.cardholderName ||
                  !formData.expiryMonth ||
                  !formData.expiryYear ||
                  !formData.cvv
                }
              >
                Add Card
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

