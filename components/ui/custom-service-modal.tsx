import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog-custom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Package, FileText, X, ArrowRight, DollarSign, Wand2, Edit, Eye, Plus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"

interface CustomServiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (service: CustomService) => void
}

interface CustomService {
  title: string
  description: string
  price: number
  features: string[]
  category: string
}

const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
}

const slideIn = {
  initial: { x: 20, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -20, opacity: 0 }
}

export default function CustomServiceModal({ isOpen, onClose, onSave }: CustomServiceModalProps) {
  const [activeTab, setActiveTab] = useState('edit')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isImproving, setIsImproving] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const { toast } = useToast()
  
  const [formData, setFormData] = useState<CustomService>({
    title: "",
    description: "",
    price: 0,
    features: [""],
    category: "Services"
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly",
        variant: "destructive",
      })
      return
    }
    onSave({
      ...formData,
      features: formData.features.filter(f => f.trim() !== "")
    })
    onClose()
  }

  const isFormValid = () => {
    return (
      formData.title.trim() !== '' &&
      formData.description.trim() !== '' &&
      formData.price > 0 &&
      formData.features.some(f => f.trim() !== '')
    )
  }

  const addFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, ""]
    }))
  }

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }))
  }

  const updateFeature = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? value : f)
    }))
  }

  const handleImproveService = async () => {
    if (!formData.title && !formData.description) {
      toast({
        title: "No Content",
        description: "Please add some content to improve",
        variant: "destructive",
      })
      return
    }

    setIsImproving(true)
    try {
      const response = await fetch('/api/enhance-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          features: formData.features.filter(f => f.trim())
        })
      })

      if (!response.ok) throw new Error('Failed to enhance service')

      const enhanced = await response.json()
      setFormData(prev => ({
        ...prev,
        title: enhanced.title || prev.title,
        description: enhanced.description || prev.description,
        features: enhanced.features || prev.features
      }))

      toast({
        title: "Service Enhanced",
        description: "Your service has been professionally improved!",
      })
    } catch (error) {
      toast({
        title: "Enhancement Failed",
        description: "Failed to enhance service. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsImproving(false)
    }
  }

  const handleGenerateService = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Input Required",
        description: "Please describe the service you want to create.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/generate-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      })

      if (!response.ok) throw new Error('Failed to generate service')

      const generated = await response.json()
      setFormData({
        title: generated.title || '',
        description: generated.description || '',
        features: generated.features || [''],
        price: generated.price || 0,
        category: 'Services'
      })
      setActiveTab('edit')

      toast({
        title: "Service Generated",
        description: "Your service has been created! Feel free to make any adjustments.",
      })
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate service. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 gap-0 bg-white rounded-2xl border-none shadow-2xl">
        <DialogHeader className="relative p-6 pb-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full w-8 h-8 bg-gray-50 hover:bg-gray-100 text-gray-500"
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex flex-col items-start space-y-4">
            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium">
              <Package className="h-4 w-4 mr-2" />
              Create Custom Service
            </span>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              New Custom Service
            </DialogTitle>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6 pt-4">
            <TabsList className="w-full grid grid-cols-3 bg-gray-100/50 p-1 rounded-xl">
              {[
                { id: 'ai', icon: Wand2, label: 'AI Generate' },
                { id: 'edit', icon: Edit, label: 'Edit' },
                { id: 'preview', icon: Eye, label: 'Preview' }
              ].map(tab => (
                <motion.div
                  key={tab.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full"
                >
                  <TabsTrigger 
                    value={tab.id} 
                    className={cn(
                      "gap-2 w-full transition-all duration-200",
                      activeTab === tab.id ? "bg-white shadow-lg text-blue-600" : "hover:bg-white/50"
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </TabsTrigger>
                </motion.div>
              ))}
            </TabsList>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={slideIn}
                transition={{ duration: 0.2 }}
              >
                <TabsContent value="ai" className="mt-0 space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Describe your ideal service
                      </label>
                      <Textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="E.g., Create a professional audio setup service for small venues, including equipment selection, installation, and sound optimization..."
                        className="min-h-[120px] rounded-xl border-gray-200 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      />
                    </div>
                    <Button
                      onClick={handleGenerateService}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl flex items-center justify-center gap-2 transition-all duration-300"
                    >
                      {isGenerating ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4" />
                          Generate Service
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="edit" className="mt-0 space-y-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Title Input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Service Title
                      </label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Enter service title"
                        className="h-11 rounded-xl border-gray-200 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe the service..."
                        className="min-h-[100px] rounded-xl border-gray-200 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        required
                      />
                    </div>

                    {/* Price Input */}
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-700">
                        <DollarSign className="h-4 w-4 mr-2 text-blue-600" />
                        Price
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                          className="pl-12 h-11 rounded-xl border-gray-200 focus:ring-blue-500 focus:border-blue-500"
                          min={0}
                          step="0.01"
                          required
                        />
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                          <span className="text-gray-500">$</span>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-2">
                      <label className="flex items-center justify-between text-sm font-medium text-gray-700">
                        <span className="flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-blue-600" />
                          Features
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={addFeature}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Feature
                        </Button>
                      </label>
                      <div className="space-y-2">
                        {formData.features.map((feature, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={feature}
                              onChange={(e) => updateFeature(index, e.target.value)}
                              placeholder={`Feature ${index + 1}`}
                              className="h-11 rounded-xl border-gray-200 focus:ring-blue-500 focus:border-blue-500"
                            />
                            {formData.features.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFeature(index)}
                                className="h-11 w-11 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        onClick={handleImproveService}
                        disabled={isImproving}
                        className="flex-1 h-11 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl flex items-center justify-center gap-2 transition-all duration-300"
                      >
                        {isImproving ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Improving...
                          </>
                        ) : (
                          <>
                            <Wand2 className="h-4 w-4" />
                            Improve with AI
                          </>
                        )}
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl flex items-center justify-center gap-2 transition-all duration-300"
                      >
                        Create Service
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="preview" className="mt-0">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                      >
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">
                            {formData.title || "Service Title"}
                          </h3>
                          <div className="mt-2 text-lg font-semibold text-blue-600">
                            ${formData.price.toLocaleString()}
                          </div>
                        </div>
                        <p className="text-gray-600 leading-relaxed">
                          {formData.description || "Service description will appear here..."}
                        </p>
                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-900">Features:</h4>
                          <ul className="space-y-2">
                            {formData.features.filter(f => f.trim()).map((feature, index) => (
                              <motion.li
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex items-center gap-2 text-gray-600"
                              >
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                                {feature}
                              </motion.li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
} 