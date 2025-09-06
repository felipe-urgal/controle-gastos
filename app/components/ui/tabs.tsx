"use client"

// app/components/ui/tabs.tsx
import * as React from "react"

interface TabsContextType {
  activeTab: string
  setActiveTab: (value: string) => void
}

const TabsContext = React.createContext<TabsContextType>({
  activeTab: "",
  setActiveTab: () => {},
})

interface TabsProps {
  defaultValue: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
}: TabsProps) {
  const [activeTab, setActiveTab] = React.useState(defaultValue)

  // Sync with controlled value if provided
  React.useEffect(() => {
    if (value !== undefined) {
      setActiveTab(value)
    }
  }, [value])

  const handleTabChange = (newValue: string) => {
    setActiveTab(newValue)
    onValueChange?.(newValue)
  }

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
}

export function TabsList({
  children,
  className,
}: TabsListProps) {
  return (
    <div className={`flex items-center gap-1 p-1 bg-gray-100/80 backdrop-blur-sm rounded-lg ${className}`}>
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
  icon?: React.ReactNode
}

export function TabsTrigger({
  value,
  children,
  className,
  icon,
}: TabsTriggerProps) {
  const { activeTab, setActiveTab } = React.useContext(TabsContext)

  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`
        relative flex items-center justify-center text-sm font-medium 
        transition-all duration-300 rounded-lg whitespace-nowrap
        ${activeTab === value
          ? "text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20"
          : "text-gray-600 hover:text-blue-700 hover:bg-white/50"
        }
        ${className}
      `}
      role="tab"
      aria-selected={activeTab === value}
      aria-controls={`tabpanel-${value}`}
    >
      {icon && <span className="text-base">{icon}</span>}
      {children}
      {activeTab === value && (
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4 h-0.5 bg-white/80 rounded-full"></div>
      )}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
}

export function TabsContent({
  value,
  children,
  className,
}: TabsContentProps) {
  const { activeTab } = React.useContext(TabsContext)

  return activeTab === value ? (
    <div 
      className={`mt-4 animate-fadeIn h-auto ${className}`}
      id={`tabpanel-${value}`}
      role="tabpanel"
      aria-labelledby={`tab-${value}`}
    >
      {children}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  ) : null
}