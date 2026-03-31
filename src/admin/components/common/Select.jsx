import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
const Select = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  label,
  error,
  helperText,
  required = false,
  disabled = false,
  clearable = false,
  searchable = false,
  multiple = false,
  size = 'md',
  variant = 'outlined',
  className = '',
  dropdownClassName = '',
  optionClassName = '',
  renderOption,
  renderValue,
  noOptionsMessage = 'No options available',
  loading = false,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const normalizedOptions = options.map(opt => typeof opt === 'string' ? {
    value: opt,
    label: opt
  } : opt);
  const filteredOptions = searchable && searchTerm ? normalizedOptions.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase())) : normalizedOptions;
  const getDisplayValue = () => {
    if (!value && value !== 0) return '';
    if (multiple && Array.isArray(value)) {
      const selected = normalizedOptions.filter(opt => value.includes(opt.value));
      if (selected.length === 0) return '';
      return selected.map(opt => opt.label).join(', ');
    }
    const selected = normalizedOptions.find(opt => opt.value === value);
    return selected ? selected.label : '';
  };
  const handleSelect = optionValue => {
    if (multiple) {
      const newValue = Array.isArray(value) ? [...value] : [];
      const index = newValue.indexOf(optionValue);
      if (index === -1) {
        newValue.push(optionValue);
      } else {
        newValue.splice(index, 1);
      }
      onChange?.(newValue);
    } else {
      onChange?.(optionValue);
      setIsOpen(false);
      setSearchTerm('');
    }
  };
  const isSelected = optionValue => {
    if (multiple && Array.isArray(value)) {
      return value.includes(optionValue);
    }
    return value === optionValue;
  };
  const handleClear = e => {
    e.stopPropagation();
    if (multiple) {
      onChange?.([]);
    } else {
      onChange?.(null);
    }
  };
  const handleKeyDown = e => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => prev < filteredOptions.length - 1 ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value);
        }
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  };
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const highlightedElement = dropdownRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex]);
  useEffect(() => {
    const handleClickOutside = event => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);
  const sizeClasses = {
    sm: {
      container: 'text-sm',
      input: 'py-1.5 pl-3 pr-8 text-sm',
      dropdown: 'text-sm'
    },
    md: {
      container: 'text-base',
      input: 'py-2 pl-4 pr-10 text-base',
      dropdown: 'text-base'
    },
    lg: {
      container: 'text-lg',
      input: 'py-3 pl-4 pr-12 text-lg',
      dropdown: 'text-lg'
    }
  };
  const variantClasses = {
    outlined: {
      container: 'border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent',
      error: 'border-red-300 focus-within:ring-red-500',
      disabled: 'bg-gray-50 border-gray-200 text-gray-500'
    },
    filled: {
      container: 'border border-transparent bg-gray-100 focus-within:bg-white focus-within:border-gray-300',
      error: 'bg-red-50 focus-within:bg-white',
      disabled: 'bg-gray-50 text-gray-500'
    },
    underlined: {
      container: 'border-b border-gray-300 rounded-none px-0 focus-within:border-primary-500',
      error: 'border-red-300',
      disabled: 'border-gray-200 text-gray-500'
    }
  };
  return <div className={`w-full ${className}`}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>}
      
      <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
        {}
        <div className={`
            relative w-full rounded-lg cursor-pointer
            ${sizeClasses[size].container}
            ${variantClasses[variant].container}
            ${error ? variantClasses[variant].error : ''}
            ${disabled ? variantClasses[variant].disabled : ''}
            transition-all duration-200
          `} onClick={() => !disabled && setIsOpen(!isOpen)}>
          <div className={`
            flex items-center justify-between
            ${sizeClasses[size].input}
            ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}>
            <div className="flex-1 truncate">
              {renderValue ? renderValue(value) : <span className={!getDisplayValue() ? 'text-gray-400' : ''}>
                  {getDisplayValue() || placeholder}
                </span>}
            </div>
            
            <div className="flex items-center space-x-1">
              {clearable && value && (multiple ? value.length > 0 : true) && !disabled && <button type="button" onClick={handleClear} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="h-3 w-3 text-gray-400" />
                </button>}
              
              <ChevronDown className={`
                h-4 w-4 text-gray-400 transition-transform duration-200
                ${isOpen ? 'transform rotate-180' : ''}
              `} />
            </div>
          </div>
        </div>

        {}
        {isOpen && !disabled && <div ref={dropdownRef} className={`
              absolute z-50 w-full mt-1 bg-white border border-gray-200 
              rounded-lg shadow-lg overflow-hidden
              ${sizeClasses[size].dropdown}
              ${dropdownClassName}
            `} style={{
        maxHeight: '300px',
        overflowY: 'auto'
      }}>
            {}
            {searchable && <div className="sticky top-0 bg-white border-b border-gray-200 p-2">
                <input ref={searchInputRef} type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..." className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent" onClick={e => e.stopPropagation()} />
              </div>}

            {}
            {loading ? <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
              </div> : filteredOptions.length > 0 ? filteredOptions.map((option, index) => <div key={option.value} className={`
                    px-4 py-2 cursor-pointer flex items-center justify-between
                    hover:bg-primary-50 transition-colors
                    ${isSelected(option.value) ? 'bg-primary-50 text-primary-700' : 'text-gray-700'}
                    ${highlightedIndex === index ? 'bg-primary-50' : ''}
                    ${optionClassName}
                  `} onClick={() => handleSelect(option.value)} onMouseEnter={() => setHighlightedIndex(index)}>
                  {renderOption ? renderOption(option) : <>
                      <span className="flex-1">{option.label}</span>
                      {isSelected(option.value) && <Check className="h-4 w-4 text-primary-600" />}
                    </>}
                </div>) : <div className="px-4 py-3 text-sm text-gray-500 text-center">
                {noOptionsMessage}
              </div>}
          </div>}
      </div>

      {}
      {(error || helperText) && <p className={`mt-1 text-sm ${error ? 'text-red-600' : 'text-gray-500'}`}>
          {error || helperText}
        </p>}
    </div>;
};
export default Select;
