import { useThemeColors } from "@/app/hook/useThemeColors";

interface LoadingSkeletonProps {
  count?: number;
  type?: 'list' | 'card' | 'table' | 'text';
  className?: string;
}

export default function LoadingSkeleton({ 
  count = 5, 
  type = 'list',
  className = "" 
}: LoadingSkeletonProps) {
  const theme = useThemeColors();

  // Configurações por tipo
  const skeletonConfig = {
    list: {
      container: `flex items-center justify-between p-3 border mb-3 rounded-lg ${theme.border.primary} ${theme.bg.secondary}`,
      elements: [
        { class: `w-2 h-2 rounded-full ${theme.bg.tertiary}`, width: 'w-2' },
        { class: `h-3 rounded ${theme.bg.tertiary}`, width: 'w-24 sm:w-32' },
        { class: `h-2 rounded ${theme.bg.tertiary}`, width: 'w-16 sm:w-24' },
        { class: `h-3 rounded ${theme.bg.tertiary}`, width: 'w-12 sm:w-20' },
        { class: `h-2 rounded ${theme.bg.tertiary}`, width: 'w-10 sm:w-16' }
      ]
    },
    card: {
      container: `p-4 border rounded-lg ${theme.border.primary} ${theme.bg.secondary}`,
      elements: [
        { class: `h-4 rounded ${theme.bg.tertiary}`, width: 'w-3/4' },
        { class: `h-3 rounded ${theme.bg.tertiary}`, width: 'w-1/2' },
        { class: `h-8 rounded ${theme.bg.tertiary}`, width: 'w-full' },
        { class: `h-3 rounded ${theme.bg.tertiary}`, width: 'w-1/3' }
      ]
    },
    table: {
      container: `p-3 border-b ${theme.border.primary} ${theme.bg.primary}`,
      elements: [
        { class: `h-4 rounded ${theme.bg.tertiary}`, width: 'w-20' },
        { class: `h-4 rounded ${theme.bg.tertiary}`, width: 'w-32' },
        { class: `h-4 rounded ${theme.bg.tertiary}`, width: 'w-24' },
        { class: `h-4 rounded ${theme.bg.tertiary}`, width: 'w-16' }
      ]
    },
    text: {
      container: `space-y-2 ${theme.bg.transparent}`,
      elements: [
        { class: `h-4 rounded ${theme.bg.tertiary}`, width: 'w-full' },
        { class: `h-4 rounded ${theme.bg.tertiary}`, width: 'w-5/6' },
        { class: `h-4 rounded ${theme.bg.tertiary}`, width: 'w-4/6' },
        { class: `h-4 rounded ${theme.bg.tertiary}`, width: 'w-3/4' }
      ]
    }
  };

  const config = skeletonConfig[type];

  const renderSkeletonElement = (element: typeof config.elements[0], index: number) => (
    <div 
      key={index}
      className={`${element.class} ${element.width} animate-pulse`}
    />
  );

  return (
    <div className={`p-3 ${className}`}>
      {[...Array(count)].map((_, index) => (
        <div key={index} className={config.container}>
          {type === 'list' ? (
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center space-x-3">
                {renderSkeletonElement(config.elements[0], 0)}
                <div className="space-y-1">
                  {renderSkeletonElement(config.elements[1], 1)}
                  {renderSkeletonElement(config.elements[2], 2)}
                </div>
              </div>
              <div className="space-y-1">
                {renderSkeletonElement(config.elements[3], 3)}
                {renderSkeletonElement(config.elements[4], 4)}
              </div>
            </div>
          ) : type === 'card' ? (
            <div className="space-y-3">
              {config.elements.map((element, idx) => 
                renderSkeletonElement(element, idx)
              )}
            </div>
          ) : type === 'table' ? (
            <div className="flex space-x-4">
              {config.elements.map((element, idx) => 
                renderSkeletonElement(element, idx)
              )}
            </div>
          ) : (
            <div className={config.container}>
              {config.elements.map((element, idx) => 
                renderSkeletonElement(element, idx)
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
