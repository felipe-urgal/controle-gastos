// app/components/DashboardSkeleton.tsx
const DashboardSkeleton = () => {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Skeleton para cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((item) => (
          <div 
            key={item} 
            className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 transition-all duration-300 hover:shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-1/3"></div>
              <div className="w-10 h-10 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl"></div>
            </div>
            <div className="h-9 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-2/3 mt-2"></div>
            <div className="h-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-4/5 mt-4"></div>
          </div>
        ))}
      </div>

      {/* Skeleton para gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="h-6 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-1/4 mb-6"></div>
          <div className="h-72 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl">
            <div className="h-full flex items-end space-x-2 px-4 pb-3">
              {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                <div 
                  key={bar} 
                  className="h-3/5 bg-gradient-to-t from-gray-200 to-gray-100 rounded-t w-full"
                  style={{ height: `${30 + (bar * 10)}%` }}
                ></div>
              ))}
            </div>
          </div>
          <div className="flex justify-center mt-4 space-x-8">
            {[1, 2, 3, 4, 5, 6, 7].map((dot) => (
              <div key={dot} className="h-2 w-2 bg-gray-200 rounded-full"></div>
            ))}
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="h-6 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-1/3 mb-6"></div>
          <div className="relative h-72 flex items-center justify-center">
            <div className="absolute w-48 h-48 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full"></div>
            <div className="absolute w-32 h-32 bg-white rounded-full"></div>
          </div>
          <div className="flex justify-center mt-6 space-x-4">
            {[
              { color: "bg-gray-200", width: "w-16" },
              { color: "bg-gray-300", width: "w-10" },
              { color: "bg-gray-400", width: "w-8" }
            ].map((item, index) => (
              <div key={index} className="flex items-center">
                <div className={`h-3 ${item.width} ${item.color} rounded-full mr-2`}></div>
                <div className="h-3 bg-gray-200 rounded-full w-12"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Skeleton para contas */}
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2].map((item) => (
            <div 
              key={item} 
              className="bg-white rounded-2xl shadow-md p-5 border border-gray-100 transition-all duration-300 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl mr-4"></div>
                  <div>
                    <div className="h-5 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-28 mb-2"></div>
                    <div className="h-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-20"></div>
                  </div>
                </div>
                <div className="h-8 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-24"></div>
              </div>
              <div className="mt-5 pt-4 border-t border-gray-100">
                <div className="flex justify-between">
                  <div className="h-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-16"></div>
                  <div className="h-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-20"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;