// components/dashboard/DateSelector.tsx
"use client";

// components
import { Button } from "@/app/components";

// icons
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';

// utils
import { months } from '@/app/utils/format';

interface DateSelectorProps {
  currentDate: Date;
  onPrevious: () => void;
  onNext: () => void;
}

const DateSelector = ({ currentDate, onPrevious, onNext }: DateSelectorProps) => {
  return (
    <div className="flex justify-between">
      <Button 
        variant='secondary'
        onClick={onPrevious}
        icon={<FaArrowLeft size={16} />}
        className='mx-3'
      />
      
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-400">
          {months[currentDate.getMonth()]} de {currentDate.getFullYear()}
        </h2>
      </div>
      
      <Button
        variant='secondary'
        onClick={onNext}
        icon={<FaArrowRight size={16} />}
        className='mx-3'
      />
    </div>
  );
}

export default DateSelector;