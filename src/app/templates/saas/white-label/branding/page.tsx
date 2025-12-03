"use client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Image from "next/image";
import { UploadIcon } from "@heroicons/react/24/outline";
import React, { useState } from "react";

export default function WhiteLabelBrandingPage() {
  const [branding, setBranding] = useState({
    companyName: "SaaS Platform",
    logo: "/images/logo/logo.svg",
    favicon: "/images/logo/favicon.png",
    primaryColor: "#4F46E5",
    secondaryColor: "#7C3AED",
    supportEmail: "support@example.com",
    supportPhone: "+1 (555) 123-4567",
  });

  return (
    <div>
      <PageBreadcrumb pageTitle="White-Label Branding" />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Branding</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Customize your platform&apos;s branding and visual identity
          </p>
        </div>

        {/* Company Information */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Company Information
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                type="text"
                defaultValue={branding.companyName}
                onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="support-email">Support Email</Label>
              <Input
                id="support-email"
                type="email"
                defaultValue={branding.supportEmail}
                onChange={(e) => setBranding({ ...branding, supportEmail: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="support-phone">Support Phone</Label>
              <Input
                id="support-phone"
                type="tel"
                defaultValue={branding.supportPhone}
                onChange={(e) => setBranding({ ...branding, supportPhone: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Logo & Favicon */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Logo & Favicon
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <Label>Company Logo</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="h-24 w-24 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800">
                  <Image
                    src={branding.logo}
                    alt="Logo"
                    width={96}
                    height={96}
                    className="h-full w-full object-contain"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <UploadIcon className="h-4 w-4" />
                  Upload Logo
                </Button>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Recommended size: 200x50px (PNG, SVG)
              </p>
            </div>
            <div>
              <Label>Favicon</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800">
                  <Image
                    src={branding.favicon}
                    alt="Favicon"
                    width={64}
                    height={64}
                    className="h-full w-full object-contain"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <UploadIcon className="h-4 w-4" />
                  Upload Favicon
                </Button>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Recommended size: 32x32px (PNG, ICO)
              </p>
            </div>
          </div>
        </div>

        {/* Color Scheme */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Color Scheme</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="mt-2 flex gap-2">
                <input
                  id="primary-color"
                  type="color"
                  value={branding.primaryColor}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  className="h-11 w-20 cursor-pointer rounded-lg border border-gray-300 dark:border-gray-700"
                />
                <Input
                  type="text"
                  value={branding.primaryColor}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="secondary-color">Secondary Color</Label>
              <div className="mt-2 flex gap-2">
                <input
                  id="secondary-color"
                  type="color"
                  value={branding.secondaryColor}
                  onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                  className="h-11 w-20 cursor-pointer rounded-lg border border-gray-300 dark:border-gray-700"
                />
                <Input
                  type="text"
                  value={branding.secondaryColor}
                  onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-4">
            <div
              className="h-16 flex-1 rounded-lg"
              style={{ backgroundColor: branding.primaryColor }}
            />
            <div
              className="h-16 flex-1 rounded-lg"
              style={{ backgroundColor: branding.secondaryColor }}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button>Save Branding Settings</Button>
        </div>
      </div>
    </div>
  );
}

