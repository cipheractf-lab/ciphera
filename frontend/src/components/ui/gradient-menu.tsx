import React from 'react';
import { Link } from 'react-router-dom';
import {
  IoCameraOutline,
  IoHeartOutline,
  IoHomeOutline,
  IoShareSocialOutline,
  IoVideocamOutline,
} from 'react-icons/io5';

type GradientMenuItem = {
  title: string;
  icon: React.ReactNode;
  gradientFrom: string;
  gradientTo: string;
  path?: string;
  active?: boolean;
  onClick?: () => void;
};

type GradientMenuProps = {
  items?: GradientMenuItem[];
  embedded?: boolean;
  className?: string;
};

const menuItems: GradientMenuItem[] = [
  { title: 'Home', icon: <IoHomeOutline />, gradientFrom: '#a955ff', gradientTo: '#ea51ff' },
  { title: 'Video', icon: <IoVideocamOutline />, gradientFrom: '#56CCF2', gradientTo: '#2F80ED' },
  { title: 'Photo', icon: <IoCameraOutline />, gradientFrom: '#FF9966', gradientTo: '#FF5E62' },
  { title: 'Share', icon: <IoShareSocialOutline />, gradientFrom: '#80FF72', gradientTo: '#7EE8FA' },
  { title: 'Tym', icon: <IoHeartOutline />, gradientFrom: '#ffa9c6', gradientTo: '#f434e2' }
];

export default function GradientMenu({
  items = menuItems,
  embedded = false,
  className = '',
}: GradientMenuProps) {
  const containerClassName = embedded
    ? `flex items-center justify-center ${className}`.trim()
    : `flex justify-center items-center min-h-screen bg-dark ${className}`.trim();

  return (
    <div className={containerClassName}>
      <ul className={`flex items-center ${embedded ? 'gap-3' : 'gap-6'} flex-wrap`}>
        {items.map(({ title, icon, gradientFrom, gradientTo, path, active, onClick }, idx) => {
          const itemStyle = {
            '--gradient-from': gradientFrom,
            '--gradient-to': gradientTo,
          } as React.CSSProperties;

          const activeStateClassName = active
            ? 'w-[148px] shadow-none'
            : embedded
              ? 'hover:w-[148px]'
              : 'hover:w-[180px]';
          const widthClassName = embedded ? 'w-[52px] h-[52px]' : 'w-[60px] h-[60px]';
          const labelClassName = active ? 'scale-100' : 'scale-0 group-hover:scale-100';
          const iconClassName = active ? 'scale-0' : 'group-hover:scale-0';
          const shellClassName = `relative ${widthClassName} ${activeStateClassName} bg-white shadow-lg rounded-full flex items-center justify-center transition-all duration-500 group cursor-pointer overflow-visible`;
          const glowClassName = `absolute top-[10px] inset-x-0 h-full rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] blur-[15px] -z-10 transition-all duration-500 ${active ? 'opacity-60' : 'opacity-0 group-hover:opacity-50'}`;
          const fillClassName = `absolute inset-0 rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] transition-all duration-500 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`;
          const content = (
            <>
              <span className={fillClassName}></span>
              <span className={glowClassName}></span>

              <span className={`relative z-10 transition-all duration-500 delay-0 ${iconClassName}`}>
                <span className={`text-2xl ${active ? 'text-white' : 'text-gray-500'}`}>{icon}</span>
              </span>

              <span className={`absolute z-10 text-white uppercase tracking-[0.22em] text-[11px] font-semibold whitespace-nowrap transition-all duration-500 delay-150 ${labelClassName}`}>
                {title}
              </span>
            </>
          );

          return (
            <li key={`${title}-${idx}`} style={itemStyle} className={shellClassName}>
              {path ? (
                <Link
                  to={path}
                  aria-label={title}
                  onClick={onClick}
                  className="absolute inset-0 z-20 rounded-full"
                />
              ) : null}
              {content}
            </li>
          );
        })}
      </ul>
    </div>
  );
}