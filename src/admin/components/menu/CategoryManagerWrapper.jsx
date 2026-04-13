import { logger } from "../../../common/utils/logger.js";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CategoryManager } from "./CategoryManager";
import { menuService } from "../../../services";
import { AdminPageSkeleton } from "../common/AdminSkeleton";
export function CategoryManagerWrapper() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadCategories();
  }, []);
  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await menuService.getCategories(false);
      setCategories(response.data || []);
    } catch (error) {
      logger.error("Failed to load categories:", error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };
  const handleBack = () => {
    navigate("/admin/menu/items");
  };
  const handleCategoriesUpdate = (updatedCategories) => {
    setCategories(updatedCategories);
  };
  if (loading) {
    return (
      <AdminPageSkeleton stats={4} filters={2} cards={6} cardHeight="h-40" />
    );
  }
  return (
    <CategoryManager
      onBack={handleBack}
      categories={categories}
      onCategoriesUpdate={handleCategoriesUpdate}
    />
  );
}
