import { logger } from "../../../common/utils/logger.js";
import React, { useState, useRef, useEffect } from "react";
import { LogOut, ChevronDown, ChevronUp, UserCircle2, Settings as SettingsIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../common/context/AuthContext";
import { buildAdminPath } from "../../../common/utils/routes";
export function AccountPopover({
  user
}) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);
  const navigate = useNavigate();
  const {
    logout
  } = useAuth();
  useEffect(() => {
    const handleClickOutside = event => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const handleLogout = async () => {
    try {
      await logout();
      navigate(buildAdminPath("/login"));
    } catch (error) {
      logger.error("Logout failed:", error);
    }
  };
  const handleNavigate = path => {
    setIsOpen(false);
    navigate(path);
  };
  const getInitials = name => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };
  const getRoleDisplayName = role => {
    const roleNames = {
      super_admin: "Platform Admin",
      admin: "Administrator",
      manager: "Manager",
      chef: "Chef",
      waiter: "Waiter",
      customer: "Customer"
    };
    return roleNames[role] || role;
  };
  return <div className="relative" ref={popoverRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Account menu" aria-expanded={isOpen}>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {getInitials(user?.name)}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
          </div>

          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">
              {getRoleDisplayName(user?.role)}
            </p>
          </div>
        </div>

        <div className="text-gray-400">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {isOpen && <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {getInitials(user?.name)}
              </div>
              <div>
                <div className="mt-1">
                  <span className="inline-flex items-center  py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 capitalize">
                    {getRoleDisplayName(user?.role)}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="px-2 py-2 space-y-1">
            <button onClick={() => handleNavigate(buildAdminPath("/profile"))} className="flex items-center w-full px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              <UserCircle2 className="h-4 w-4 mr-3 text-primary-600" />
              <span>Profile & Security</span>
            </button>
            {user?.role !== "super_admin" ? <button onClick={() => handleNavigate(buildAdminPath("/settings/restaurant"))} className="flex items-center w-full px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                <SettingsIcon className="h-4 w-4 mr-3 text-primary-600" />
                <span>Restaurant Settings</span>
              </button> : null}
          </div>

          <div className="border-t border-gray-100 pt-1">
            <button onClick={handleLogout} className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors">
              <LogOut className="h-4 w-4 mr-3" />
              <span>Logout</span>
            </button>
          </div>
        </div>}
    </div>;
}
