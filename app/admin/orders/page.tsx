'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  ClipboardX,
  Trash2,
  Mail,
  ChevronUp,
  ChevronDown,
  Info,
  Truck,
  MapPin,
  Phone,
  Building2,
  Package,
  Plus,
  FileText,
  DollarSign,
  Wrench,
  CreditCard,
  PenTool,
  X,
  Eye,
  RefreshCw,
  PackageSearch,
  User,
  Clock, 
  CheckCircle2, 
  XCircle,
  Settings,
  Code,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import EmailComposer from '@/components/admin/EmailComposer'

const Editor = dynamic(() => import('@/components/ui/editor'), { ssr: false })

interface OrderItem {
  id: number
  product_id: number
  quantity: number
  price_at_time: number | string
  cost_at_time: number | string
  product?: {
    title: string
    category?: string
    is_service?: boolean
    id?: number
  }
}

interface Order {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  organization: string
  shipping_address: string
  shipping_city: string
  shipping_state: string
  shipping_zip: string
  shipping_instructions: string
  installation_address: string
  installation_city: string
  installation_state: string
  installation_zip: string
  installation_date: string
  installation_time: string
  access_instructions: string
  contact_onsite: string
  contact_onsite_phone: string
  payment_method: string
  total_amount: number | string
  total_cost: number | string
  total_profit: number | string
  installation_price: number | string
  signature_url: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  created_at: string
  order_items: OrderItem[]
}

const TAX_RATE = 0.0775 // 7.75% for Riverside, CA

const formatPrice = (price: number | string | null | undefined): string => {
  if (price === null || price === undefined) return '0.00'
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price
  return numericPrice.toFixed(2)
}

const calculateTax = (amount: number | string): number => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  return numericAmount * TAX_RATE
}

const calculateTotalWithTax = (amount: number | string): number => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  return numericAmount * (1 + TAX_RATE)
}

// Update the isServiceItem helper function to check for services
const isServiceItem = (item: OrderItem): boolean => {
  // Check if the product exists and has category or is_service flag
  if (!item.product) return false;
  
  return (
    item.product.category === 'Services' || 
    item.product.category === 'Services/Custom' || 
    item.product.is_service === true
  );
};

const calculateOrderTax = (order: Order): number => {
  const taxableAmount = order.order_items.reduce((sum, item) => {
    // Skip tax for services
    if (isServiceItem(item)) {
      return sum;
    }
    return sum + (Number(item.price_at_time) * item.quantity);
  }, 0);
  
  return taxableAmount * 0.0775; // 7.75% tax rate
};

const calculateOrderRevenue = (order: Order) => {
  const revenue = {
    products: 0,
    services: 0,
    installation: Number(order.installation_price || 0)
  };

  order.order_items.forEach(item => {
    const price = Number(item.price_at_time) * item.quantity;
    if (isServiceItem(item)) {
      revenue.services += price;
    } else {
      revenue.products += price;
    }
  });

  return revenue;
};

const calculateOrderProfit = (order: Order) => {
  const profit = {
    products: 0,
    services: 0,
    installation: Number(order.installation_price || 0)  // 100% profit
  };

  console.log('Calculating profit for order:', order.id);
  
  order.order_items.forEach(item => {
    const price = Number(item.price_at_time) * item.quantity;
    console.log('Item:', {
      id: item.id,
      product: item.product,
      price,
      isService: isServiceItem(item)
    });
    
    if (isServiceItem(item)) {
      profit.services += price;  // 100% profit for services
      console.log('Added to services profit:', price);
    } else {
      profit.products += price * 0.2155;  // 21.55% profit for products
      console.log('Added to products profit:', price * 0.2155);
    }
  });

  console.log('Final profit calculation:', profit);
  return profit;
};

const calculateOrderTotalWithTax = (order: Order): number => {
  const { taxableSubtotal, nonTaxableSubtotal } = order.order_items.reduce(
    (acc, item) => {
      const itemTotal = Number(item.price_at_time) * item.quantity;
      if (isServiceItem(item)) {
        return {
          ...acc,
          nonTaxableSubtotal: acc.nonTaxableSubtotal + itemTotal
        };
      }
      return {
        ...acc,
        taxableSubtotal: acc.taxableSubtotal + itemTotal
      };
    },
    { taxableSubtotal: 0, nonTaxableSubtotal: 0 }
  );

  const tax = taxableSubtotal * 0.0775;
  return taxableSubtotal + nonTaxableSubtotal + tax + Number(order.installation_price || 0);
};

const handleResendEmail = async (orderId: number) => {
  try {
    const response = await fetch(`/api/admin/orders/${orderId}/resend-email`, {
      method: 'POST',
    });

    if (response.ok) {
      toast.success(`Order confirmation email has been resent for order #${orderId}`);
    } else {
      throw new Error('Failed to resend email');
    }
  } catch (error) {
    console.error('Error resending email:', error);
    toast.error("Failed to resend email. Please try again.");
  }
}

const handleDeleteOrder = async (orderId: number, orders: Order[], setOrders: React.Dispatch<React.SetStateAction<Order[]>>) => {
  if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
    return;
  }

  try {
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      setOrders(orders.filter((order: Order) => order.id !== orderId));
      toast.success(`Order #${orderId} has been deleted successfully`);
    } else {
      throw new Error('Failed to delete order');
    }
  } catch (error) {
    console.error('Error deleting order:', error);
    toast.error("Failed to delete order. Please try again.");
  }
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'pending':
      return 'default'
    case 'confirmed':
      return 'secondary'
    case 'completed':
      return 'default'
    case 'cancelled':
      return 'destructive'
    default:
      return 'default'
  }
}

// Update type definitions
type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'all';
type OrderStatusUpdate = 'pending' | 'confirmed' | 'completed' | 'cancelled';
type SortOrder = 'newest' | 'oldest' | 'highest' | 'lowest';

// Add this before the component
function formatEmailPreview({ subject, content, order }: { 
  subject: string
  content: string
  order: any
}): string {
  // Ensure proper content formatting
  const formattedContent = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line)
    .map(line => line.startsWith('<p>') ? line : `<p style="margin: 0 0 16px 0; line-height: 1.6;">${line}</p>`)
    .join('\n')

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            margin: 0;
            padding: 0;
            background-color: #f4f4f5;
            -webkit-font-smoothing: antialiased;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          }
          .wrapper {
            width: 100%;
            background-color: #f4f4f5;
            padding: 40px 0;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(to right, #2563eb, #3b82f6);
            padding: 32px 40px;
            color: white;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .content-wrapper {
            padding: 40px;
          }
          .content {
            color: #374151;
            font-size: 16px;
            line-height: 1.6;
          }
          .content p {
            margin: 0 0 16px 0;
          }
          .order-details {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
          }
          .order-details h3 {
            color: #1e293b;
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 12px 0;
          }
          .order-detail-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
          }
          .order-detail-row:last-child {
            border-bottom: none;
          }
          .detail-label {
            color: #64748b;
            font-size: 14px;
          }
          .detail-value {
            color: #0f172a;
            font-size: 14px;
            font-weight: 500;
          }
          .signature {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
          }
          .signature-name {
            color: #1e293b;
            font-weight: 600;
            margin: 0 0 4px 0;
          }
          .signature-title {
            color: #64748b;
            font-size: 14px;
            margin: 0 0 16px 0;
          }
          .footer {
            background-color: #f8fafc;
            padding: 24px 40px;
            border-top: 1px solid #e2e8f0;
          }
          .footer p {
            color: #64748b;
            font-size: 14px;
            margin: 0;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="email-container">
            <div class="header">
              <h1>Dear ${order.first_name},</h1>
            </div>
            
            <div class="content-wrapper">
              <div class="content">
                ${formattedContent}
              </div>

              <div class="order-details">
                <h3>Order Details</h3>
                <div class="order-detail-row">
                  <span class="detail-label">Order Number</span>
                  <span class="detail-value">#${order.id}</span>
                </div>
                <div class="order-detail-row">
                  <span class="detail-label">Total Amount</span>
                  <span class="detail-value">$${order.total_amount}</span>
                </div>
                ${order.installation_date ? `
                <div class="order-detail-row">
                  <span class="detail-label">Installation Date</span>
                  <span class="detail-value">${new Date(order.installation_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
                ` : ''}
              </div>

              <div class="signature">
                <p class="signature-name">Way of Glory Team</p>
                <p class="signature-title">Customer Success Team</p>
                <div style="margin-top: 16px;">
                  <img src="https://wayofglory.com/logo.png" alt="Way of Glory" style="height: 40px;" />
                </div>
              </div>
            </div>

            <div class="footer">
              <p>If you have any questions, please don't hesitate to contact us.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

// Add these calculation functions at the top level
const calculateTotalRevenue = (orders: Order[]): { products: number, installation: number } => {
  return orders.reduce((totals, order) => {
    const productRevenue = order.order_items.reduce((sum, item) => {
      const price = typeof item.price_at_time === 'string' ? parseFloat(item.price_at_time) : item.price_at_time;
      return sum + (price * item.quantity);
    }, 0);

    const installationRevenue = order.installation_price ? 
      (typeof order.installation_price === 'string' ? parseFloat(order.installation_price) : order.installation_price) 
      : 0;

    return {
      products: totals.products + productRevenue,
      installation: totals.installation + installationRevenue
    };
  }, { products: 0, installation: 0 });
};

const calculateTotalProfit = (orders: Order[]): { products: number, installation: number } => {
  return orders.reduce((totals, order) => {
    const productProfit = order.order_items.reduce((sum, item) => {
      const price = typeof item.price_at_time === 'string' ? parseFloat(item.price_at_time) : item.price_at_time;
      const cost = typeof item.cost_at_time === 'string' ? parseFloat(item.cost_at_time) : item.cost_at_time;
      const profit = (price - cost) * item.quantity;
      return sum + profit;
    }, 0);

    const installationRevenue = order.installation_price ? 
      (typeof order.installation_price === 'string' ? parseFloat(order.installation_price) : order.installation_price) 
      : 0;

    return {
      products: totals.products + productProfit,
      installation: totals.installation + installationRevenue // 100% profit on installation
    };
  }, { products: 0, installation: 0 });
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [isEmailTemplatesOpen, setIsEmailTemplatesOpen] = useState(false)
  const [sendingTemplateId, setSendingTemplateId] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [editedSubject, setEditedSubject] = useState('')
  const [editedContent, setEditedContent] = useState('')
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({})
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [isAiPromptOpen, setIsAiPromptOpen] = useState(false)
  const [shippingStatus, setShippingStatus] = useState('')
  const [isShippingPromptOpen, setIsShippingPromptOpen] = useState(false)

  // Calculate revenue and profit totals
  const revenue = calculateTotalRevenue(orders);
  const profit = calculateTotalProfit(orders);
  const profitMargin = orders.length > 0 ? 
    ((profit.products + profit.installation) / (revenue.products + revenue.installation) * 100) : 0;

  const emailTemplates = [
    {
      id: 'payment_reminder',
      title: 'Payment Reminder',
      subject: 'Payment Reminder for Your Way of Glory Order',
      description: 'Remind customer about pending payment',
      icon: DollarSign,
    },
    {
      id: 'installation_confirmation',
      title: 'Installation Confirmation',
      subject: 'Installation Details for Your Way of Glory Order',
      description: 'Confirm installation date and details',
      icon: Wrench,
    },
    {
      id: 'shipping_update',
      title: 'Shipping Update',
      subject: 'Shipping Update for Your Way of Glory Order',
      description: 'Update customer about shipping status',
      icon: Truck,
    },
    {
      id: 'thank_you',
      title: 'Thank You',
      subject: 'Thank You for Your Way of Glory Order',
      description: 'Send a thank you note after completion',
      icon: CheckCircle2,
    },
  ]

  const filterAndSortOrders = useCallback(() => {
    let filtered = [...orders]

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(order => 
        order.first_name.toLowerCase().includes(searchLower) ||
        order.last_name.toLowerCase().includes(searchLower) ||
        order.email.toLowerCase().includes(searchLower) ||
        order.id.toString().includes(searchLower)
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at).toISOString().split('T')[0]
        switch (dateFilter) {
          case 'today':
            return orderDate === today
          case 'week':
            return orderDate >= weekAgo
          case 'month':
            return orderDate >= monthAgo
          case 'year':
            return orderDate >= yearAgo
          default:
            return true
        }
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      } else if (sortOrder === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else {
        const aAmount = typeof a.total_amount === 'string' ? parseFloat(a.total_amount) : a.total_amount
        const bAmount = typeof b.total_amount === 'string' ? parseFloat(b.total_amount) : b.total_amount
        if (sortOrder === 'highest') {
          return bAmount - aAmount
        } else {
          return aAmount - bAmount
        }
      }
    })

    setFilteredOrders(filtered)
  }, [orders, searchTerm, statusFilter, dateFilter, sortOrder])

  useEffect(() => {
    fetchOrders()
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    filterAndSortOrders()
  }, [searchTerm, statusFilter, dateFilter, sortOrder, orders, filterAndSortOrders])

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/admin/orders')
      if (response.ok) {
        const data = await response.json()
        setOrders(data)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getOrderStatistics = () => {
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      confirmed: orders.filter(o => o.status === 'confirmed').length,
      completed: orders.filter(o => o.status === 'completed').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      revenue: {
        products: 0,
        services: 0,
        installation: 0
      },
      profit: {
        products: 0,
        services: 0,
        installation: 0
      },
      totalTax: 0
    };

    orders.forEach(order => {
      const orderRevenue = calculateOrderRevenue(order);
      const orderProfit = calculateOrderProfit(order);

      // Add revenue
      stats.revenue.products += orderRevenue.products;
      stats.revenue.services += orderRevenue.services;
      stats.revenue.installation += orderRevenue.installation;

      // Add profit
      stats.profit.products += orderProfit.products;
      stats.profit.services += orderProfit.services;
      stats.profit.installation += orderProfit.installation;

      // Calculate tax (only on products)
      stats.totalTax += calculateOrderTax(order);
    });

    return stats;
  };

  const updateOrderStatus = async (orderId: number, newStatus: OrderStatusUpdate) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Update the orders list
        setOrders(orders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus }
            : order
        ));

        toast.success(`Order #${orderId} status has been updated to ${newStatus}`);
      } else {
        throw new Error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error("Failed to update order status. Please try again.");
    }
  };

  const handleDelete = (orderId: number) => {
    handleDeleteOrder(orderId, orders, setOrders);
  };

  const getTemplatePrompt = (templateType: string) => {
    switch (templateType) {
      case 'payment_reminder':
        return `Create a professional payment reminder email with the following requirements:
        
        Subject: Payment Reminder for Order #${selectedOrder?.id}

        Email Content:
        - Start with a polite greeting to ${selectedOrder?.first_name}
        - Remind about the pending payment of $${selectedOrder?.total_amount}
        - Clearly state that we ONLY accept these payment methods:
          * Cash (in person at our office)
          * Check (made payable to Way of Glory)
          * Direct Deposit/Bank Transfer
        - For cash payments: Include our office address and hours
        - For checks: Provide mailing address and check details
        - For direct deposit: Include bank account information
        - Create appropriate urgency while staying professional
        - Include our contact information for payment questions
        - End with a professional signature

        Note: The email must follow our exact HTML structure with header, content, and footer sections.`
      case 'installation_confirmation':
        return `Create a professional installation confirmation email with the following requirements:
        
        Subject: Installation Confirmation for Order #${selectedOrder?.id}

        Email Content:
        - Start with a warm greeting to ${selectedOrder?.first_name}
        - Confirm the installation date: ${selectedOrder?.installation_date}
        - List preparation instructions for the customer
        - Explain what to expect during installation
        - Include our contact information
        - End with a professional signature

        Note: The email must follow our exact HTML structure with header, content, and footer sections.`
      case 'shipping_update':
        return `Create a professional shipping update email with the following requirements:
        
        Subject: Shipping Update for Order #${selectedOrder?.id}

        Email Content:
        - Start with a friendly greeting to ${selectedOrder?.first_name}
        - Inform that their order status is: ${shippingStatus}
        - Provide specific details based on the status:
          ${shippingStatus === 'Processing' ? '* Order is being prepared for shipping\n      * Expected to ship within 1-2 business days' : ''}
          ${shippingStatus === 'Shipped' ? '* Order has been shipped\n      * Include tracking number placeholder\n      * Estimated delivery timeframe' : ''}
          ${shippingStatus === 'Out for Delivery' ? '* Order will be delivered today\n      * Delivery window if available' : ''}
          ${shippingStatus === 'Delayed' ? '* Explain reason for delay\n      * Provide new estimated timeframe\n      * Apologize for inconvenience' : ''}
        - Include any relevant next steps or actions needed
        - Provide customer support contact information
        - End with a professional signature

        Note: The email must follow our exact HTML structure with header, content, and footer sections.`
      case 'thank_you':
        return `Create a professional thank you email with the following requirements:
        
        Subject: Thank You for Your Order #${selectedOrder?.id}

        Email Content:
        - Start with a warm greeting to ${selectedOrder?.first_name}
        - Express sincere gratitude for their business
        - Confirm their order details (Order #${selectedOrder?.id})
        - Provide any relevant follow-up information
        - Encourage future engagement
        - End with a professional signature

        Note: The email must follow our exact HTML structure with header, content, and footer sections.`
      default:
        return emailTemplates.find(t => t.id === templateType)?.description || ''
    }
  }

  const handleShippingUpdate = async (status: string) => {
    setShippingStatus(status)
    setIsShippingPromptOpen(false)
    setIsGeneratingAI(true)
    
    const templatePrompt = `Create a shipping update email for Order #${selectedOrder?.id}.
    Current Status: ${status}

    Guidelines:
    - Only state the current order status
    - Do not include any estimated times or dates unless provided
    - Do not make assumptions about delivery times
    - Provide only factual information about the order
    - Include customer service contact information for questions
    - Keep the message clear and concise

    Note: Stick to only the facts we know about the order status.`

    try {
      const response = await fetch('/api/admin/generate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: templatePrompt,
          templateType: 'shipping_update',
          order: selectedOrder,
          viewMode,
          variables: {
            customerName: `${selectedOrder?.first_name} ${selectedOrder?.last_name}`,
            orderNumber: selectedOrder?.id,
            amount: selectedOrder?.total_amount,
            installationDate: selectedOrder?.installation_date,
          }
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate content')
      }

      setPreviewHtml(data.content || '')
      setEditedSubject(data.subject || '')
      toast.success('Email content generated successfully')
    } catch (error) {
      console.error('Error generating content:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate content. Please try again.')
    } finally {
      setIsGeneratingAI(false)
    }
  }

  // Clear email state function
  const clearEmailState = () => {
    setPreviewHtml('')
    setEditedSubject('')
    setEditedContent('')
    setSelectedTemplate(null)
    setViewMode('edit')
    setTemplateVars({})
    setIsGeneratingAI(false)
    setSendingTemplateId(null)
    setAiPrompt('')
  }

  // Handle email templates dialog
  const handleEmailTemplatesOpenChange = (open: boolean) => {
    if (!open) {
      clearEmailState()
    }
    setIsEmailTemplatesOpen(open)
  }

  // Handle template selection
  const handleTemplateSelect = async (templateId: string) => {
    try {
      // Clear existing content first
      clearEmailState()
      setSelectedTemplate(templateId)
      
      if (templateId === 'shipping_update') {
        setIsShippingPromptOpen(true)
        return
      }
      
      // Only proceed with AI generation if we have a template
      if (templateId) {
        setIsGeneratingAI(true)
        const templatePrompt = getTemplatePrompt(templateId)
        if (!templatePrompt) return

        const response = await fetch('/api/admin/generate-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: templatePrompt,
            templateType: templateId,
            order: selectedOrder,
            viewMode,
            variables: {
              customerName: `${selectedOrder?.first_name} ${selectedOrder?.last_name}`,
              orderNumber: selectedOrder?.id,
              amount: selectedOrder?.total_amount,
              installationDate: selectedOrder?.installation_date,
            }
          }),
        })

        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to generate content')
        }

        setPreviewHtml(viewMode === 'preview' ? data.html : data.content)
        setEditedContent(data.content)
        setEditedSubject(data.subject || '')
        setIsAiPromptOpen(false)
        toast.success('Email content generated successfully')
      }
    } catch (error) {
      console.error('Error generating content:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate content. Please try again.')
    } finally {
      setIsGeneratingAI(false)
    }
  }

  // Handle email generation
  const handleGenerateEmail = async () => {
    try {
      // Clear existing content first
      clearEmailState()
      setIsGeneratingAI(true)
      
      const response = await fetch('/api/admin/generate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          templateType: selectedTemplate || 'custom',
          order: selectedOrder,
          viewMode,
          variables: {
            customerName: `${selectedOrder?.first_name} ${selectedOrder?.last_name}`,
            orderNumber: selectedOrder?.id,
            amount: selectedOrder?.total_amount,
            installationDate: selectedOrder?.installation_date,
          }
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate content')
      }

      setPreviewHtml(viewMode === 'preview' ? data.html : data.content)
      setEditedContent(data.content)
      setEditedSubject(data.subject || '')
      setIsAiPromptOpen(false)
      toast.success('Email content generated successfully')
    } catch (error) {
      console.error('Error generating content:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate content. Please try again.')
    } finally {
      setIsGeneratingAI(false)
    }
  }

  // Handle sending email
  const handleSendEmail = async () => {
    if (!selectedOrder?.id) {
      toast.error('No order selected')
      return
    }

    try {
      setSendingTemplateId('sending')
      
      // First generate the email content if using AI template
      let emailContent = editedContent
      let emailSubject = editedSubject
      
      if (selectedTemplate && selectedTemplate !== 'custom') {
        const generateResponse = await fetch('/api/admin/generate-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: getTemplatePrompt(selectedTemplate),
            order: selectedOrder,
            templateType: selectedTemplate
          }),
        })

        if (!generateResponse.ok) {
          throw new Error('Failed to generate email content')
        }

        const generatedEmail = await generateResponse.json()
        emailSubject = generatedEmail.subject
        emailContent = generatedEmail.content
      }

      // Send the email using our Gmail-based system
      const response = await fetch(`/api/admin/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          email: selectedOrder.email,
          subject: emailSubject,
          content: emailContent,
          customerName: `${selectedOrder.first_name} ${selectedOrder.last_name}`,
          templateId: selectedTemplate || 'custom',
          order: selectedOrder // Pass the full order for proper email formatting
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send email')
      }

      toast.success('Email sent successfully')
      setEditedContent('')
      setEditedSubject('')
      setSelectedTemplate(null)
      setIsEmailTemplatesOpen(false)
    } catch (error) {
      console.error('Error sending email:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send email')
    } finally {
      setSendingTemplateId(null)
    }
  }

  // Handle quick generate
  const handleQuickGenerate = async (templateId: string) => {
    try {
      clearEmailState()
      setPreviewHtml('<p>Generating your email content...</p>')
      setIsGeneratingAI(true)
      
      const templatePrompt = getTemplatePrompt(templateId)
      if (!templatePrompt) return

      const response = await fetch('/api/admin/generate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: templatePrompt,
          templateType: templateId,
          order: selectedOrder,
          viewMode,
          variables: {
            customerName: `${selectedOrder?.first_name} ${selectedOrder?.last_name}`,
            orderNumber: selectedOrder?.id,
            amount: selectedOrder?.total_amount,
            installationDate: selectedOrder?.installation_date,
          }
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate content')
      }

      setPreviewHtml(data.html || '')
      setEditedSubject(data.subject || '')
      setIsAiPromptOpen(false)
      toast.success('Email content generated successfully')
    } catch (error) {
      console.error('Error generating content:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate content. Please try again.')
      setPreviewHtml('<p>Start typing your email content here...</p>')
    } finally {
      setIsGeneratingAI(false)
    }
  }

  // Handle new email
  const handleNewEmail = () => {
    clearEmailState()
  }

  const isServiceOnlyOrder = (order: Order): boolean => {
    return order.order_items.every(item => isServiceItem(item));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const stats = getOrderStatistics()

  return (
    <div className="max-w-[1600px] mx-auto p-8 space-y-8">
      {/* Header Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
              Sales & Orders
            </h1>
            <p className="mt-3 text-gray-600 text-lg">
              Track and manage your sales, orders, and installations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2 hover:bg-gray-100 transition-colors">
              <FileText className="h-4 w-4" />
              Export Orders
            </Button>
            <Button className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all">
              <Plus className="h-4 w-4" />
              New Order
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
        {/* Orders Stats */}
        <div className="bg-white rounded-2xl border border-gray-200/50 p-6 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Orders Overview</h3>
            <div className="w-24">
              <Select defaultValue="thisMonth">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="thisWeek">This Week</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="thisYear">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Orders</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
              <p className="text-sm text-gray-500">Cancelled</p>
            </div>
          </div>
        </div>

        {/* Revenue Stats */}
        <div className="bg-white rounded-2xl border border-gray-200/50 p-6 shadow-sm hover:shadow-md transition-all duration-200">
          <h3 className="text-sm font-medium text-gray-500 mb-6">Revenue Overview</h3>
          <div className="space-y-6">
            {/* Revenue Section */}
            <div>
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Revenue</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    <p className="text-sm text-gray-600">Products</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    ${stats.revenue.products.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <p className="text-sm text-gray-600">Services</p>
                  </div>
                  <p className="text-sm font-semibold text-blue-600">
                    ${stats.revenue.services.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <p className="text-sm text-gray-600">Installation</p>
                  </div>
                  <p className="text-sm font-semibold text-blue-600">
                    ${stats.revenue.installation.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-900">Total Revenue</p>
                  <p className="text-base font-bold text-gray-900">
                    ${(stats.revenue.products + stats.revenue.services + stats.revenue.installation).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Profit Section */}
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Profit</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    <p className="text-sm text-gray-600">Products (21.55%)</p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-600">
                    ${(stats.profit.products).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                    <p className="text-sm text-gray-600">Services & Installation (100%)</p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-600">
                    ${(stats.profit.services + stats.profit.installation).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-900">Total Profit</p>
                  <p className="text-base font-bold text-emerald-600">
                    ${(stats.profit.products + stats.profit.services + stats.profit.installation).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tax Stats */}
        <div className="bg-white rounded-2xl border border-gray-200/50 p-6 shadow-sm hover:shadow-md transition-all duration-200">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Tax Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">${stats.totalTax.toFixed(2)}</p>
                <p className="text-sm text-gray-500">Total Tax Collected</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Tax Rate</p>
                <p className="text-sm font-medium text-gray-900">7.75%</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Average Tax per Order</p>
                <p className="text-sm font-medium text-gray-900">
                  ${(stats.totalTax / stats.total).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Installation Stats */}
        <div className="bg-white rounded-2xl border border-gray-200/50 p-6 shadow-sm hover:shadow-md transition-all duration-200">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Installation Revenue</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  ${orders.reduce((sum, order) => sum + Number(order.installation_price || 0), 0).toFixed(2)}
                </p>
                <p className="text-sm text-gray-500">Total Installation Revenue</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Wrench className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Orders with Installation</p>
                <p className="text-sm font-medium text-gray-900">
                  {orders.filter(order => Number(order.installation_price) > 0).length}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Average Installation Price</p>
                <p className="text-sm font-medium text-gray-900">
                  ${(orders.reduce((sum, order) => sum + Number(order.installation_price || 0), 0) / 
                     orders.filter(order => Number(order.installation_price) > 0).length || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 mb-8 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Search */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search orders by customer name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Status Filter */}
            <Select 
              value={statusFilter} 
              onValueChange={(value: OrderStatus) => setStatusFilter(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range */}
            <Select 
              value={dateFilter} 
              onValueChange={setDateFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select 
              value={sortOrder} 
              onValueChange={(value: SortOrder) => setSortOrder(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort orders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="highest">Highest Amount</SelectItem>
                <SelectItem value="lowest">Lowest Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters */}
        {(statusFilter !== 'all' || dateFilter !== 'all' || searchTerm) && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">Active Filters:</span>
            {statusFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Status: {statusFilter}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => setStatusFilter('all')}
                />
              </Badge>
            )}
            {dateFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Date: {dateFilter}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => setDateFilter('all')}
                />
              </Badge>
            )}
            {searchTerm && (
              <Badge variant="secondary" className="gap-1">
                Search: {searchTerm}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => setSearchTerm('')}
                />
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setStatusFilter('all');
                setDateFilter('all');
                setSearchTerm('');
              }}
            >
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr className="border-b border-gray-200/50">
                <th className="text-left p-4 text-sm font-medium text-gray-600">Order Details</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Customer</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Amount</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Status</th>
                <th className="text-left p-4 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="group hover:bg-blue-50/5 transition-all duration-200">
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900">
                        #{order.id}
                      </span>
                      <span className="text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900">
                        {order.first_name} {order.last_name}
                      </span>
                      <span className="text-sm text-gray-600">
                        {order.email}
                      </span>
                      {order.phone && (
                        <span className="text-sm text-gray-500">
                          {order.phone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900">
                        ${Number(order.total_amount).toFixed(2)}
                      </span>
                      {isServiceOnlyOrder(order) ? (
                        <span className="text-xs text-blue-600">
                          No Tax (Service)
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">
                          Includes ${calculateOrderTax(order).toFixed(2)} tax
                        </span>
                      )}
                      {Number(order.installation_price) > 0 && (
                        <span className="text-xs text-gray-600">
                          Includes ${Number(order.installation_price).toFixed(2)} installation
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge
                      variant={getStatusVariant(order.status)}
                      className="capitalize font-medium px-3 py-1 rounded-full shadow-sm"
                    >
                      {order.status}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 hover:bg-gray-100"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsDetailsOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      {order.signature_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 hover:bg-gray-100"
                          onClick={() => {
                            setSelectedSignature(order.signature_url);
                          }}
                        >
                          <PenTool className="h-4 w-4" />
                          Signature
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 hover:bg-gray-100"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsStatusOpen(true);
                        }}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Status
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredOrders.length === 0 && (
          <div className="p-12 text-center">
            <PackageSearch className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No orders found</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                ? 'Try adjusting your filters or search term'
                : 'Orders will appear here when customers place them'}
            </p>
          </div>
        )}
      </div>

      {/* Order Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-0 rounded-2xl shadow-xl border-0">
          <button
            onClick={() => setIsDetailsOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white border border-gray-200 shadow-sm p-2 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <X className="h-4 w-4 text-gray-500" />
            <span className="sr-only">Close</span>
          </button>
          <DialogHeader className="p-6 pb-4 border-b sticky top-0 bg-white z-10 shadow-sm">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">#</span>
                <span className="font-bold">{selectedOrder?.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">•</span>
                <span>{selectedOrder?.first_name} {selectedOrder?.last_name}</span>
              </div>
              {selectedOrder && (
                <Badge
                  variant={getStatusVariant(selectedOrder.status)}
                  className="capitalize ml-auto"
                >
                  {selectedOrder.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-white relative">
              {/* Customer Information */}
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
                    <User className="h-4 w-4" />
                    Customer Information
                  </h4>
                  <div className="space-y-3">
                    <p className="text-sm flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="text-gray-600 break-all">{selectedOrder.email}</span>
                    </p>
                    <p className="text-sm flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="text-gray-600">{selectedOrder.phone}</span>
                    </p>
                    {selectedOrder.organization && (
                      <p className="text-sm flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="text-gray-600">{selectedOrder.organization}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Shipping Information */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
                    <Truck className="h-4 w-4" />
                    Shipping Information
                  </h4>
                  <div className="space-y-3">
                    <p className="text-sm flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                      <span className="text-gray-600">
                        {selectedOrder.shipping_address}<br />
                        {selectedOrder.shipping_city}, {selectedOrder.shipping_state} {selectedOrder.shipping_zip}
                      </span>
                    </p>
                    {selectedOrder.shipping_instructions && (
                      <div className="border-t border-gray-200 pt-2">
                        <p className="text-sm text-gray-900 font-medium mb-1">Instructions:</p>
                        <p className="text-sm text-gray-600">{selectedOrder.shipping_instructions}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Installation & Payment */}
              <div className="space-y-6">
                {/* Installation Details */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
                    <Wrench className="h-4 w-4" />
                    Installation Details
                  </h4>
                  <div className="space-y-3">
                    <p className="text-sm flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                      <span className="text-gray-600">
                        {selectedOrder.installation_address}<br />
                        {selectedOrder.installation_city}, {selectedOrder.installation_state} {selectedOrder.installation_zip}
                      </span>
                    </p>
                    <div className="border-t border-gray-200 pt-2 space-y-3">
                      <p className="text-sm flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">
                          {new Date(selectedOrder.installation_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                          {selectedOrder.installation_time && ` at ${selectedOrder.installation_time}`}
                        </span>
                      </p>
                      {selectedOrder.contact_onsite && (
                        <p className="text-sm flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">
                            Contact: {selectedOrder.contact_onsite} ({selectedOrder.contact_onsite_phone})
                          </span>
                        </p>
                      )}
                      {selectedOrder.access_instructions && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-sm text-gray-900 font-medium mb-1">Access Instructions:</p>
                          <p className="text-sm text-gray-600">{selectedOrder.access_instructions}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Information */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
                    <CreditCard className="h-4 w-4" />
                    Payment Information
                  </h4>
                  <div className="space-y-3">
                    <p className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="text-gray-600">
                        Method: <span className="capitalize">{selectedOrder.payment_method}</span>
                      </span>
                    </p>
                    <div className="border-t border-gray-200 pt-3">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Products Subtotal</span>
                          <span className="font-medium">
                            ${(selectedOrder.order_items.reduce((sum, item) => 
                              sum + (Number(item.price_at_time) * item.quantity), 0)).toFixed(2)}
                          </span>
                        </div>
                        {Number(selectedOrder.installation_price || 0) > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Installation</span>
                            <span className="font-medium">
                              ${Number(selectedOrder.installation_price || 0).toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Sales Tax</span>
                          <span className="font-medium text-purple-600">
                            ${calculateOrderTax(selectedOrder).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between font-medium pt-2 border-t border-gray-200">
                          <span className="text-gray-900">Total</span>
                          <span className="text-lg text-gray-900">
                            ${Number(selectedOrder.total_amount).toFixed(2)}
                          </span>
                        </div>
                        <div className="pt-4 border-t border-gray-200">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Product Profit (21.55%)</span>
                              <span className="font-medium text-green-600">
                                ${((selectedOrder.order_items.reduce((sum, item) => 
                                  sum + (Number(item.price_at_time) * item.quantity), 0)) * 0.2155).toFixed(2)}
                              </span>
                            </div>
                            {Number(selectedOrder.installation_price || 0) > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Installation Profit (100%)</span>
                                <span className="font-medium text-green-600">
                                  ${Number(selectedOrder.installation_price || 0).toFixed(2)}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between font-medium pt-2 border-t border-gray-200">
                              <span className="text-gray-900">Total Profit</span>
                              <span className="text-lg text-green-600">
                                ${(
                                  ((selectedOrder.order_items.reduce((sum, item) => 
                                    sum + (Number(item.price_at_time) * item.quantity), 0)) * 0.2155) +
                                  Number(selectedOrder.installation_price || 0)
                                ).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
                    <Package className="h-4 w-4" />
                    Order Items
                  </h4>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {selectedOrder.order_items.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm py-2 border-b border-gray-200 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{item.product?.title}</span>
                          <Badge variant="secondary" className="bg-gray-100">
                            x{item.quantity}
                          </Badge>
                        </div>
                        <span className="text-gray-600">${Number(item.price_at_time).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Signature Section */}
                {selectedOrder.signature_url && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
                      <PenTool className="h-4 w-4" />
                      Customer Signature
                    </h4>
                    <div className="flex justify-center bg-white p-4 rounded-lg border border-gray-100">
                      <img 
                        src={selectedOrder.signature_url} 
                        alt="Customer Signature" 
                        className="max-h-32 object-contain"
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      Signed electronically on {new Date(selectedOrder.created_at).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
                    <Settings className="h-4 w-4" />
                    Actions
                  </h4>
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2 bg-white hover:bg-gray-100"
                      onClick={() => handleResendEmail(selectedOrder.id)}
                    >
                      <Mail className="h-4 w-4" />
                      Resend Order Email
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2 bg-white hover:bg-gray-100"
                      onClick={() => {
                        setIsDetailsOpen(false);
                        setIsStatusOpen(true);
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Update Status
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2 bg-white hover:bg-gray-100"
                      onClick={() => handleEmailTemplatesOpenChange(true)}
                    >
                      <FileText className="h-4 w-4" />
                      Send Email Template
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Current Status</Label>
                <Badge
                  variant={getStatusVariant(selectedOrder.status)}
                  className="capitalize"
                >
                  {selectedOrder.status}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label>New Status</Label>
                <Select
                  value={selectedOrder.status}
                  onValueChange={(value: OrderStatusUpdate) => {
                    updateOrderStatus(selectedOrder.id, value);
                    setIsStatusOpen(false);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Templates Dialog */}
      <Dialog open={isEmailTemplatesOpen} onOpenChange={handleEmailTemplatesOpenChange}>
        <DialogContent className="max-w-7xl h-[90vh] bg-white p-0 gap-0">
          <div className="border-b px-6 py-4">
            <DialogTitle className="text-xl font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-gray-500" />
                <span>{selectedTemplate ? emailTemplates.find(t => t.id === selectedTemplate)?.title : 'Email Templates'}</span>
              </div>
              {selectedTemplate && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-2 ${viewMode === 'edit' ? 'bg-blue-50 text-blue-600' : ''}`}
                    onClick={() => setViewMode('edit')}
                  >
                    <Code className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-2 ${viewMode === 'preview' ? 'bg-blue-50 text-blue-600' : ''}`}
                    onClick={() => setViewMode('preview')}
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                </div>
              )}
            </DialogTitle>
          </div>
          
          <div className="flex h-[calc(90vh-80px)]">
            <div className="w-80 border-r overflow-y-auto p-4 bg-gray-50">
              <div className="mb-4">
                <Button
                  className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    clearEmailState()
                    setSelectedTemplate(null);
                    setPreviewHtml('');
                    setEditedSubject('');
                    setTemplateVars({});
                    setViewMode('edit');
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Create New Email
                </Button>
              </div>
              
              <div className="space-y-1 mb-4">
                <h4 className="text-sm font-medium text-gray-500 px-4">Email Templates</h4>
              </div>

              <div className="space-y-3">
                {emailTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`flex items-start gap-3 p-4 rounded-lg border ${
                      selectedTemplate === template.id 
                        ? 'border-blue-500 bg-white shadow-sm' 
                        : 'border-transparent hover:border-gray-200 hover:bg-white'
                    } transition-all cursor-pointer relative group`}
                    onClick={() => !sendingTemplateId && handleTemplateSelect(template.id)}
                  >
                    <div className={`p-2 rounded-lg ${
                      selectedTemplate === template.id ? 'bg-blue-50' : 'bg-gray-100'
                    }`}>
                      {sendingTemplateId === template.id ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      ) : (
                        <template.icon className={`h-5 w-5 ${
                          selectedTemplate === template.id ? 'text-blue-600' : 'text-gray-600'
                        }`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{template.title}</h4>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{template.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Email Subject</Label>
                    <Input
                      value={editedSubject}
                      onChange={(e) => setEditedSubject(e.target.value)}
                      className="w-full"
                      placeholder="Enter email subject..."
                    />
                  </div>

                  <Tabs defaultValue="content" className="w-full">
                    <div className="flex items-center justify-between mb-4">
                      <TabsList className="grid w-[400px] grid-cols-2">
                        <TabsTrigger value="content" className="gap-2">
                          <FileText className="h-4 w-4" />
                          Content
                        </TabsTrigger>
                        <TabsTrigger value="variables" className="gap-2">
                          <Settings className="h-4 w-4" />
                          Variables
                        </TabsTrigger>
                      </TabsList>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                        onClick={() => setIsAiPromptOpen(true)}
                      >
                        <Sparkles className="h-4 w-4" />
                        Generate with AI
                      </Button>
                    </div>

                    <TabsContent value="content" className="mt-0">
                      {viewMode === 'edit' ? (
                        <EmailComposer
                          orderId={String(selectedOrder?.id || '')}
                          initialContent={editedContent}
                          onContentChange={(content) => {
                            setEditedContent(content)
                            setPreviewHtml(content)
                          }}
                          onSubjectChange={(subject) => setEditedSubject(subject)}
                          subject={editedSubject}
                          onEmailSent={() => {
                            clearEmailState()
                          }}
                        />
                      ) : (
                        <div className="border rounded-lg bg-gray-50 p-8">
                          <div className="max-w-[700px] mx-auto bg-white rounded-lg shadow-sm overflow-hidden">
                            {/* Email Header */}
                            <div className="border-b bg-white px-8 py-4">
                              <div className="text-sm text-gray-500 mb-1">Subject</div>
                              <div className="text-lg font-medium text-gray-900">{editedSubject}</div>
                            </div>
                            
                            {/* Email Body */}
                            <div className="px-8 py-6 bg-white">
                              <div 
                                className="prose max-w-none text-gray-800"
                                style={{
                                  fontSize: '15px',
                                  lineHeight: '1.6',
                                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
                                }}
                                dangerouslySetInnerHTML={{ 
                                  __html: previewHtml.replace(/\n/g, '<br/>') 
                                }} 
                              />
                            </div>

                            {/* Email Footer */}
                            <div className="bg-gray-50 px-8 py-4 text-sm text-gray-500 border-t">
                              <div>Way of Glory</div>
                              <div>123 ABC Street, City, State, ZIP</div>
                              <div>Phone: (123) 456-7890</div>
                              <div>Email: info@wayofglory.com</div>
                              <div>Website: www.wayofglory.com</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="variables" className="mt-0">
                      <div className="bg-white border rounded-lg p-6 shadow-sm">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Customer Name</Label>
                            <Input
                              value={templateVars.customerName || ''}
                              onChange={(e) => setTemplateVars(prev => ({
                                ...prev,
                                customerName: e.target.value
                              }))}
                              placeholder={`${selectedOrder?.first_name} ${selectedOrder?.last_name}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Order Number</Label>
                            <Input
                              value={templateVars.orderNumber || ''}
                              onChange={(e) => setTemplateVars(prev => ({
                                ...prev,
                                orderNumber: e.target.value
                              }))}
                              placeholder={`#${selectedOrder?.id}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Total Amount</Label>
                            <Input
                              value={templateVars.totalAmount || ''}
                              onChange={(e) => setTemplateVars(prev => ({
                                ...prev,
                                totalAmount: e.target.value
                              }))}
                              placeholder={`$${selectedOrder?.total_amount}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Installation Date</Label>
                            <Input
                              value={templateVars.installationDate || ''}
                              onChange={(e) => setTemplateVars(prev => ({
                                ...prev,
                                installationDate: e.target.value
                              }))}
                              placeholder={selectedOrder?.installation_date || ''}
                            />
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="flex items-center gap-4 p-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      clearEmailState()
                      setIsEmailTemplatesOpen(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
                    onClick={handleGenerateEmail}
                    disabled={!aiPrompt.trim() || isGeneratingAI}
                  >
                    {isGeneratingAI ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate Email
                      </>
                    )}
                  </Button>
                  {previewHtml && (
                    <Button
                      className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                      onClick={handleSendEmail}
                      disabled={sendingTemplateId === 'sending'}
                    >
                      {sendingTemplateId === 'sending' ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4" />
                          Send Email
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Prompt Dialog */}
      <Dialog open={isAiPromptOpen} onOpenChange={setIsAiPromptOpen}>
        <DialogContent className="sm:max-w-[800px] bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-blue-500" />
              Generate Email Content
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <Tabs defaultValue="quick" className="w-full">
              <TabsList className="grid w-[400px] grid-cols-2 mb-6">
                <TabsTrigger value="quick" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <Sparkles className="h-4 w-4" />
                  Quick Generate
                </TabsTrigger>
                <TabsTrigger value="custom" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <PenTool className="h-4 w-4" />
                  Custom Write
                </TabsTrigger>
              </TabsList>

              <TabsContent value="quick" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {emailTemplates.map((template) => (
                    <Button
                      key={template.id}
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors bg-white text-gray-700"
                      onClick={() => {
                        setAiPrompt(template.description)
                        handleQuickGenerate(template.id)
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <template.icon className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{template.title}</span>
                      </div>
                      <p className="text-sm text-gray-500 text-left">{template.description}</p>
                    </Button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="custom" className="mt-0 space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">What would you like to say?</Label>
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Describe what you want to communicate to the customer..."
                      className="w-full h-32 p-4 text-sm rounded-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                    />
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex gap-2">
                      <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="space-y-2 text-sm text-gray-700">
                        <p className="font-medium">Available Variables:</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>{'{{customerName}}'} - Full name of the customer</li>
                          <li>{'{{orderNumber}}'} - Order reference number</li>
                          <li>{'{{amount}}'} - Total order amount</li>
                          <li>{'{{installationDate}}'} - Scheduled installation date</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setIsAiPromptOpen(false)}
              className="text-gray-700 hover:text-gray-900"
            >
              Cancel
            </Button>
            <Button
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleGenerateEmail}
              disabled={!aiPrompt.trim() || isGeneratingAI}
            >
              {isGeneratingAI ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Email
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shipping Status Dialog */}
      <Dialog open={isShippingPromptOpen} onOpenChange={setIsShippingPromptOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Truck className="h-5 w-5 text-blue-500" />
              Select Current Order Status
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {isGeneratingAI && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-50">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  <p className="text-sm text-gray-600">Generating email...</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3">
              {['Processing', 'Shipped', 'Out for Delivery', 'Delayed'].map((status) => (
                <Button
                  key={status}
                  variant="outline"
                  className="w-full justify-start gap-3 py-6 text-left"
                  onClick={() => handleShippingUpdate(status)}
                  disabled={isGeneratingAI}
                >
                  <div className="flex items-center gap-3">
                    {status === 'Processing' && <Package className="h-5 w-5 text-blue-500" />}
                    {status === 'Shipped' && <Truck className="h-5 w-5 text-green-500" />}
                    {status === 'Out for Delivery' && <MapPin className="h-5 w-5 text-purple-500" />}
                    {status === 'Delayed' && <Clock className="h-5 w-5 text-orange-500" />}
                    <div>
                      <div className="font-medium">{status}</div>
                      <div className="text-sm text-gray-500">
                        Select to update customer about this status
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 