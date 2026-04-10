import React, { useEffect, useMemo, useState } from "react";
import { Clock, Image as ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { AdminModal } from "../common/AdminModal";
import { createImagePreview, IMAGE_UPLOAD_ACCEPT, revokeImagePreview, validateImageFile } from "../../../common/utils/imageUpload";
const buildInitialPrices = (item, sizes) => {
  if (item?.prices?.length) {
    return item.prices.map(p => ({
      sizeId: p.size?._id || p.sizeId || "",
      price: p.price ?? "",
      costPrice: p.costPrice ?? ""
    })).filter(p => p.sizeId);
  }
  if (sizes.length > 0) {
    return [{
      sizeId: sizes[0]._id,
      price: "",
      costPrice: ""
    }];
  }
  return [{
    sizeId: "",
    price: "",
    costPrice: ""
  }];
};
export function ItemForm({
  item,
  onSave,
  onCancel,
  categories,
  sizes = [],
  isSaving = false
}) {
  const [formData, setFormData] = useState({
    name: item?.name || "",
    description: item?.description || "",
    category: item?.category?._id || item?.category || categories[0]?._id || "",
    image: item?.image || "",
    preparationTime: item?.preparationTime ?? "",
    ingredients: item?.ingredients?.join(", ") || "",
    spiceLevel: item?.spiceLevel || 0,
    isVegetarian: item?.isVegetarian || false,
    isVegan: item?.isVegan || false,
    isGlutenFree: item?.isGlutenFree || false,
    isAvailable: item?.isAvailable ?? true,
    tags: item?.tags?.join(", ") || "",
    seasonal: {
      isSeasonal: item?.seasonal?.isSeasonal || false,
      startDate: item?.seasonal?.startDate ? new Date(item.seasonal.startDate).toISOString().slice(0, 10) : "",
      endDate: item?.seasonal?.endDate ? new Date(item.seasonal.endDate).toISOString().slice(0, 10) : "",
      seasonName: item?.seasonal?.seasonName || ""
    },
    discount: {
      isActive: item?.discount?.isActive || false,
      type: item?.discount?.type || "percentage",
      value: item?.discount?.value ?? "",
      code: item?.discount?.code || "",
      description: item?.discount?.description || "",
      startDate: item?.discount?.startDate ? new Date(item.discount.startDate).toISOString().slice(0, 10) : "",
      endDate: item?.discount?.endDate ? new Date(item.discount.endDate).toISOString().slice(0, 10) : ""
    },
    nutritionalInfo: item?.nutritionalInfo || {
      calories: "",
      protein: "",
      carbs: "",
      fat: ""
    },
    prices: buildInitialPrices(item, sizes)
  });
  const [imageFile, setImageFile] = useState(null);
  const [errors, setErrors] = useState({});
  const usedSizeIds = useMemo(() => new Set(formData.prices.map(p => p.sizeId).filter(Boolean)), [formData.prices]);
  useEffect(() => () => {
    revokeImagePreview(formData.image);
  }, [formData.image]);
  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }
    if (!formData.category) newErrors.category = "Category is required";
    if (!formData.preparationTime || formData.preparationTime <= 0) {
      newErrors.preparationTime = "Valid preparation time is required";
    }
    if (!formData.ingredients.trim()) {
      newErrors.ingredients = "Ingredients are required";
    }
    if (!formData.prices.length) {
      newErrors.prices = "At least one size/price is required";
    }
    formData.prices.forEach((priceRow, index) => {
      if (!priceRow.sizeId) {
        newErrors[`size-${index}`] = "Size is required";
      }
      if (!priceRow.price || Number(priceRow.price) <= 0) {
        newErrors[`price-${index}`] = "Valid price is required";
      }
      if (priceRow.costPrice !== "" && Number(priceRow.costPrice) < 0) {
        newErrors[`cost-${index}`] = "Cost price cannot be negative";
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = e => {
    e.preventDefault();
    if (isSaving) {
      return;
    }
    if (!validateForm()) {
      return;
    }
    const submitData = {
      ...formData,
      preparationTime: parseInt(formData.preparationTime, 10),
      spiceLevel: parseInt(formData.spiceLevel, 10),
      ingredients: formData.ingredients.split(",").map(ing => ing.trim()).filter(Boolean),
      tags: formData.tags ? formData.tags.split(",").map(tag => tag.trim()).filter(Boolean) : [],
      prices: formData.prices.map(priceRow => ({
        sizeId: priceRow.sizeId,
        price: parseFloat(priceRow.price),
        ...(priceRow.costPrice !== "" ? {
          costPrice: parseFloat(priceRow.costPrice)
        } : {})
      })),
      seasonal: {
        isSeasonal: formData.seasonal.isSeasonal,
        startDate: formData.seasonal.startDate || undefined,
        endDate: formData.seasonal.endDate || undefined,
        seasonName: formData.seasonal.seasonName.trim() || undefined
      },
      discount: {
        isActive: formData.discount.isActive,
        type: formData.discount.type,
        value: formData.discount.value === "" ? 0 : parseFloat(formData.discount.value),
        code: formData.discount.code.trim(),
        description: formData.discount.description.trim(),
        startDate: formData.discount.startDate || undefined,
        endDate: formData.discount.endDate || undefined
      },
      isNonVegetarian: !formData.isVegetarian
    };
    if (formData.nutritionalInfo) {
      const cleanNutritionalInfo = Object.fromEntries(Object.entries(formData.nutritionalInfo).filter(([, value]) => value !== ""));
      if (Object.keys(cleanNutritionalInfo).length > 0) {
        submitData.nutritionalInfo = cleanNutritionalInfo;
      }
    }
    onSave(submitData, imageFile);
  };
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
  };
  const handleNutritionalInfoChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      nutritionalInfo: {
        ...prev.nutritionalInfo,
        [field]: value
      }
    }));
  };
  const handleSeasonalChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      seasonal: {
        ...prev.seasonal,
        [field]: value
      }
    }));
  };
  const handleDiscountChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      discount: {
        ...prev.discount,
        [field]: value
      }
    }));
  };
  const handleImageChange = e => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }
    const imageError = validateImageFile(file);
    if (imageError) {
      setErrors(prev => ({
        ...prev,
        image: imageError
      }));
      e.target.value = "";
      return;
    }
    setImageFile(file);
    const imageUrl = createImagePreview(file);
    setFormData(prev => ({
      ...prev,
      image: imageUrl
    }));
    setErrors(prev => ({
      ...prev,
      image: ""
    }));
  };
  const handleRemoveImage = () => {
    revokeImagePreview(formData.image);
    setFormData(prev => ({
      ...prev,
      image: ""
    }));
    setImageFile(null);
    setErrors(prev => ({
      ...prev,
      image: ""
    }));
  };
  const updatePriceRow = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      prices: prev.prices.map((row, rowIndex) => rowIndex === index ? {
        ...row,
        [field]: value
      } : row)
    }));
    setErrors(prev => ({
      ...prev,
      [`size-${index}`]: "",
      [`price-${index}`]: "",
      [`cost-${index}`]: "",
      prices: ""
    }));
  };
  const addPriceRow = () => {
    setFormData(prev => ({
      ...prev,
      prices: [...prev.prices, {
        sizeId: "",
        price: "",
        costPrice: ""
      }]
    }));
  };
  const removePriceRow = index => {
    setFormData(prev => {
      if (prev.prices.length === 1) {
        return prev;
      }
      return {
        ...prev,
        prices: prev.prices.filter((_, rowIndex) => rowIndex !== index)
      };
    });
  };
  return <AdminModal isOpen={true} title={item ? "Edit Menu Item" : "Add New Menu Item"} subtitle={item ? "Update the menu item details." : "Create a new item for your menu."} onClose={onCancel} maxWidth="max-w-5xl" footer={<div className="flex items-center justify-end space-x-4">
          <button type="button" onClick={onCancel} disabled={isSaving} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60">
            Cancel
          </button>
          <button type="submit" form="menu-item-form" disabled={isSaving} className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-60">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {item ? "Update Item" : "Add Item"}
          </button>
        </div>}>
        <form id="menu-item-form" onSubmit={handleSubmit} className="space-y-6 p-5">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Name *
                </label>
                <input type="text" value={formData.name} onChange={e => handleChange("name", e.target.value)} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.name ? "border-red-300" : "border-gray-300"}`} placeholder="e.g., Margherita Pizza" />
                {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select value={formData.category} onChange={e => handleChange("category", e.target.value)} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.category ? "border-red-300" : "border-gray-300"}`}>
                  <option value="">Select Category</option>
                  {categories.map(category => <option key={category._id} value={category._id}>
                      {category.name}
                    </option>)}
                </select>
                {errors.category && <p className="text-red-600 text-sm mt-1">{errors.category}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preparation Time (minutes) *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input type="number" min="1" value={formData.preparationTime} onChange={e => handleChange("preparationTime", e.target.value)} className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.preparationTime ? "border-red-300" : "border-gray-300"}`} />
                </div>
                {errors.preparationTime && <p className="text-red-600 text-sm mt-1">
                    {errors.preparationTime}
                  </p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Spice Level
                </label>
                <select value={formData.spiceLevel} onChange={e => handleChange("spiceLevel", parseInt(e.target.value, 10))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                  <option value={0}>No Spice</option>
                  <option value={1}>Mild</option>
                  <option value={2}>Medium</option>
                  <option value={3}>Spicy</option>
                  <option value={4}>Very Spicy</option>
                  <option value={5}>Extreme</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea value={formData.description} onChange={e => handleChange("description", e.target.value)} rows={3} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.description ? "border-red-300" : "border-gray-300"}`} placeholder="Describe the menu item..." />
              {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description}</p>}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ingredients * (comma separated)
              </label>
              <textarea value={formData.ingredients} onChange={e => handleChange("ingredients", e.target.value)} rows={2} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.ingredients ? "border-red-300" : "border-gray-300"}`} placeholder="e.g., Tomato, Cheese, Basil" />
              {errors.ingredients && <p className="text-red-600 text-sm mt-1">{errors.ingredients}</p>}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (comma separated)
              </label>
              <input type="text" value={formData.tags} onChange={e => handleChange("tags", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="e.g., popular, seasonal" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Size Pricing *</h2>
              <button type="button" onClick={addPriceRow} className="inline-flex items-center gap-2 text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Plus className="h-4 w-4" />
                Add Size
              </button>
            </div>

            <div className="space-y-3">
              {formData.prices.map((priceRow, index) => {
            const availableSizes = sizes.filter(size => !usedSizeIds.has(size._id) || size._id === priceRow.sizeId);
            return <div key={`${priceRow.sizeId}-${index}`} className="grid grid-cols-12 gap-3 items-start">
                    <div className="col-span-12 md:col-span-5">
                      <select value={priceRow.sizeId} onChange={e => updatePriceRow(index, "sizeId", e.target.value)} className={`w-full px-3 py-2 border rounded-lg ${errors[`size-${index}`] ? "border-red-300" : "border-gray-300"}`}>
                        <option value="">Select Size</option>
                        {availableSizes.map(size => <option key={size._id} value={size._id}>
                            {size.name} ({size.code})
                          </option>)}
                      </select>
                      {errors[`size-${index}`] && <p className="text-red-600 text-xs mt-1">{errors[`size-${index}`]}</p>}
                    </div>

                    <div className="col-span-6 md:col-span-3">
                      <input type="number" min="0" step="0.01" value={priceRow.price} onChange={e => updatePriceRow(index, "price", e.target.value)} className={`w-full px-3 py-2 border rounded-lg ${errors[`price-${index}`] ? "border-red-300" : "border-gray-300"}`} placeholder="Selling price" />
                      {errors[`price-${index}`] && <p className="text-red-600 text-xs mt-1">{errors[`price-${index}`]}</p>}
                    </div>

                    <div className="col-span-6 md:col-span-3">
                      <input type="number" min="0" step="0.01" value={priceRow.costPrice} onChange={e => updatePriceRow(index, "costPrice", e.target.value)} className={`w-full px-3 py-2 border rounded-lg ${errors[`cost-${index}`] ? "border-red-300" : "border-gray-300"}`} placeholder="Cost price" />
                      {errors[`cost-${index}`] && <p className="text-red-600 text-xs mt-1">{errors[`cost-${index}`]}</p>}
                    </div>

                    <div className="col-span-12 md:col-span-1 flex md:justify-center">
                      <button type="button" onClick={() => removePriceRow(index)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" disabled={formData.prices.length === 1} title="Remove row">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>;
          })}
            </div>

            {errors.prices && <p className="text-red-600 text-sm mt-2">{errors.prices}</p>}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Item Image</h2>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image Preview
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {formData.image ? <div className="space-y-3">
                      <img src={formData.image} alt="Preview" className="mx-auto h-48 rounded-lg object-cover" />
                      <button type="button" onClick={handleRemoveImage} className="text-red-600 hover:text-red-700 text-sm">
                        Remove Image
                      </button>
                    </div> : <div className="py-8">
                      <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 mb-2">No image selected</p>
                    </div>}
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Image
                  </label>
                  <input type="file" accept={IMAGE_UPLOAD_ACCEPT} onChange={handleImageChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  <p className="mt-2 text-xs text-gray-500">
                    Upload a JPG or PNG image up to 2MB. Thumbnails are generated automatically after upload.
                  </p>
                  {errors.image ? <p className="mt-2 text-sm text-red-600">{errors.image}</p> : null}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Seasonal Availability
            </h2>

            <div className="space-y-4">
              <label className="flex items-center space-x-2">
                <input type="checkbox" checked={formData.seasonal.isSeasonal} onChange={e => handleSeasonalChange("isSeasonal", e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm text-gray-700">
                  Enable seasonal availability
                </span>
              </label>

              {formData.seasonal.isSeasonal ? <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Season Name
                    </label>
                    <input type="text" value={formData.seasonal.seasonName} onChange={e => handleSeasonalChange("seasonName", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g., Summer Special" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input type="date" value={formData.seasonal.startDate} onChange={e => handleSeasonalChange("startDate", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input type="date" value={formData.seasonal.endDate} onChange={e => handleSeasonalChange("endDate", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div> : null}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Item Discount</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex items-center space-x-2">
                <input type="checkbox" checked={formData.discount.isActive} onChange={e => handleDiscountChange("isActive", e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm text-gray-700">Enable item discount</span>
              </label>

              <select value={formData.discount.type} onChange={e => handleDiscountChange("type", e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2">
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount</option>
              </select>

              <input type="number" min="0" step="0.01" value={formData.discount.value} onChange={e => handleDiscountChange("value", e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Discount value" />

              <input type="text" value={formData.discount.code} onChange={e => handleDiscountChange("code", e.target.value.toUpperCase())} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Optional promo label" />

              <input type="date" value={formData.discount.startDate} onChange={e => handleDiscountChange("startDate", e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />

              <input type="date" value={formData.discount.endDate} onChange={e => handleDiscountChange("endDate", e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>

            <textarea rows={3} value={formData.discount.description} onChange={e => handleDiscountChange("description", e.target.value)} className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Describe this discount for the admin team" />
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Settings</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Dietary Information
                </label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="isVegetarian" checked={formData.isVegetarian} onChange={e => handleChange("isVegetarian", e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <label htmlFor="isVegetarian" className="text-sm text-gray-700">
                      Vegetarian
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="isVegan" checked={formData.isVegan} onChange={e => handleChange("isVegan", e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <label htmlFor="isVegan" className="text-sm text-gray-700">
                      Vegan
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="isGlutenFree" checked={formData.isGlutenFree} onChange={e => handleChange("isGlutenFree", e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <label htmlFor="isGlutenFree" className="text-sm text-gray-700">
                      Gluten Free
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="isAvailable" checked={formData.isAvailable} onChange={e => handleChange("isAvailable", e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <label htmlFor="isAvailable" className="text-sm text-gray-700">
                      Available for ordering
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Nutritional Information (per serving)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Calories</label>
                    <input type="number" value={formData.nutritionalInfo.calories} onChange={e => handleNutritionalInfoChange("calories", e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" placeholder="Cal" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Protein (g)</label>
                    <input type="number" step="0.1" value={formData.nutritionalInfo.protein} onChange={e => handleNutritionalInfoChange("protein", e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" placeholder="g" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Carbs (g)</label>
                    <input type="number" step="0.1" value={formData.nutritionalInfo.carbs} onChange={e => handleNutritionalInfoChange("carbs", e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" placeholder="g" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fat (g)</label>
                    <input type="number" step="0.1" value={formData.nutritionalInfo.fat} onChange={e => handleNutritionalInfoChange("fat", e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" placeholder="g" />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </form>
    </AdminModal>;
}
