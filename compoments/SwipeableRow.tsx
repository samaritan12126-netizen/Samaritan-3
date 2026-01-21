
import React, { useState, useRef } from 'react';
import { Trash2, Edit2, Archive } from 'lucide-react';
import { audio } from '../services/audio';

interface SwipeableRowProps {
    children: React.ReactNode;
    onSwipeLeft?: () => void; // Usually Delete
    onSwipeRight?: () => void; // Usually Edit/Archive
    bgLeft?: string; // Color for Right Swipe (revealed on left)
    bgRight?: string; // Color for Left Swipe (revealed on right)
    iconLeft?: React.ReactNode;
    iconRight?: React.ReactNode;
}

export const SwipeableRow: React.FC<SwipeableRowProps> = ({ 
    children, 
    onSwipeLeft, 
    onSwipeRight,
    bgLeft = 'bg-indigo-600',
    bgRight = 'bg-rose-600',
    iconLeft = <Edit2 size={18} className="text-white" />,
    iconRight = <Trash2 size={18} className="text-white" />
}) => {
    const [offset, setOffset] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const startX = useRef(0);
    const threshold = 80; // px to trigger

    const handleTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        setIsSwiping(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isSwiping) return;
        const currentX = e.touches[0].clientX;
        const diff = currentX - startX.current;
        
        // Limit scroll
        if (Math.abs(diff) < 150) {
            setOffset(diff);
        }
    };

    const handleTouchEnd = () => {
        setIsSwiping(false);
        
        if (offset > threshold && onSwipeRight) {
            // Swiped Right
            audio.play('CLICK');
            onSwipeRight();
            setOffset(0);
        } else if (offset < -threshold && onSwipeLeft) {
            // Swiped Left
            audio.play('CLICK');
            onSwipeLeft();
            setOffset(0);
        } else {
            // Reset
            setOffset(0);
        }
    };

    return (
        <div className="relative overflow-hidden rounded-sm touch-pan-y">
            {/* Background Actions */}
            <div className="absolute inset-0 flex justify-between items-center px-4">
                <div className={`absolute inset-y-0 left-0 w-1/2 flex items-center justify-start pl-4 transition-opacity ${offset > 0 ? 'opacity-100' : 'opacity-0'} ${bgLeft}`}>
                    {iconLeft}
                </div>
                <div className={`absolute inset-y-0 right-0 w-1/2 flex items-center justify-end pr-4 transition-opacity ${offset < 0 ? 'opacity-100' : 'opacity-0'} ${bgRight}`}>
                    {iconRight}
                </div>
            </div>

            {/* Foreground Content */}
            <div 
                className="relative bg-black transition-transform duration-200 ease-out"
                style={{ transform: `translateX(${offset}px)` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {children}
            </div>
        </div>
    );
};
