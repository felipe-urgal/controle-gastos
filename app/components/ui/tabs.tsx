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

export function Tabs({
  defaultValue,
  children,
  className,
}: {
  defaultValue: string
  children: React.ReactNode
  className?: string
}) {
  const [activeTab, setActiveTab] = React.useState(defaultValue)

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {children}
    </div>
  )
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const { activeTab, setActiveTab } = React.useContext(TabsContext)

  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`flex items-center justify-center p-3 gap-2 text-sm font-medium transition-colors ${
        activeTab === value
          ? "text-blue-600"
          : "text-gray-600 hover:text-blue-600"
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const { activeTab } = React.useContext(TabsContext)

  return activeTab === value ? (
    <div className={`${className}`}>{children}</div>
  ) : null
}