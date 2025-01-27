'use client'

import { Button } from "./button"
import { ChevronDown, ShoppingCart, Check, Star, StarHalf, Info, Plus, Minus } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { motion } from "framer-motion"
import ProductModal from './product-modal'
import { Card, CardContent } from './card'

interface ProductCardProps {
  product: {
    id: string
    title: string
    description: string
    price: number
    category: string
    image_url?: string
    features?: string[]
    included_items?: string[]
    warranty_info?: string
    installation_available?: boolean
    technical_details?: Record<string, any>
    images?: { image_url: string }[]
    our_price?: number
    quantity?: number
  }
  onClick?: () => void
  onAddToBundle?: (product: {
    id: string
    title: string
    description: string
    price: number
    category: string
    image_url?: string
    features?: string[]
    included_items?: string[]
    warranty_info?: string
    installation_available?: boolean
    technical_details?: Record<string, any>
    images?: { image_url: string }[]
    our_price?: number
    quantity: number
  }) => void
  className?: string
}

export default function ProductCard({ product, onClick, onAddToBundle, className }: ProductCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const images = product.images?.length 
    ? product.images.map(img => img.image_url)
    : product.image_url 
      ? [product.image_url] 
      : ['/placeholder.jpg']

  const handleMouseEnter = () => {
    if (images.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex(prev => (prev + 1) % images.length)
      }, 2000)
      return () => clearInterval(interval)
    }
  }

  const handleMouseLeave = () => {
    setCurrentImageIndex(0)
  }

  const handleClick = () => {
    setIsModalOpen(true)
    onClick?.()
  }

  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isWarrantySelected, setIsWarrantySelected] = useState(false)
  const [isInstallationSelected, setIsInstallationSelected] = useState(false)

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value)
    if (!isNaN(value) && value > 0) {
      setQuantity(value)
    }
  }

  const handleAddToBundle = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAddToBundle?.({ ...product, quantity })
  }

  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={`star-${i}`} className="w-4 h-4 fill-amber-400 text-amber-400" />
      )
    }

    if (hasHalfStar) {
      stars.push(
        <StarHalf key="half-star" className="w-4 h-4 fill-amber-400 text-amber-400" />
      )
    }

    const remainingStars = 5 - stars.length
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <Star key={`empty-star-${i}`} className="w-4 h-4 text-gray-200" />
      )
    }

    return stars
  }

  return (
    <>
      <Card
        className={cn(
          "group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg",
          className
        )}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="aspect-w-16 aspect-h-9 relative overflow-hidden">
          <img
            src={images[currentImageIndex]}
            alt={product.title}
            className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-300"
          />
          {images.length > 1 && (
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
              {images.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full bg-white/80",
                    currentImageIndex === index ? "opacity-100" : "opacity-50"
                  )}
                />
              ))}
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <h3 className="text-lg font-semibold line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
            {product.title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
            {product.description}
          </p>
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-bold text-blue-600">
              ${product.price.toFixed(2)}
            </span>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setQuantity(prev => Math.max(1, prev - 1));
                }}
                disabled={quantity <= 1}
                className="h-7 w-7"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-6 text-center font-medium text-sm">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setQuantity(prev => prev + 1);
                }}
                className="h-7 w-7"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAddToBundle?.({ ...product, quantity });
            }}
            className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg font-medium"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add to Bundle
          </Button>
          <span className="text-sm text-gray-500 capitalize mt-2 block">
            {product.category}
          </span>
        </CardContent>
      </Card>

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedProduct={{
          ...product,
          images: product.images?.length 
            ? product.images 
            : product.image_url 
              ? [{ image_url: product.image_url }] 
              : []
        }}
      />
    </>
  )
} 