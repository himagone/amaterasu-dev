import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import './LoadingComponent.css';

interface LoadingComponentProps {
  progress?: number;
  text?: string;
}

function LoadingComponent(props: LoadingComponentProps) {
  const { text = 'LOADING..' } = props;
  
  // アニメーション用のrefs
  const overlayRef = useRef<HTMLDivElement>(null);
  const spinnerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  // 初期アニメーション
  useEffect(() => {
    if (!overlayRef.current || !spinnerRef.current || !textRef.current) return;

    timelineRef.current = gsap.timeline();
    
    // 初期状態設定
    gsap.set(overlayRef.current, { opacity: 0 });
    gsap.set([spinnerRef.current, textRef.current], { opacity: 0, y: 20 });
    
    // エントランスアニメーション
    timelineRef.current
      .to(overlayRef.current, {
        opacity: 1,
        duration: 0.5,
        ease: "power2.out"
      })
      .to(spinnerRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "back.out(1.7)"
      }, "-=0.3")
      .to(textRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: "power2.out"
      }, "-=0.2");

    // スピナーの回転アニメーション
    gsap.to(spinnerRef.current, {
      rotation: 360,
      duration: 2,
      ease: "none",
      repeat: -1
    });

    // アイコンの軽いフローティングアニメーション
    if (iconRef.current) {
      gsap.to(iconRef.current, {
        y: -3,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    }

    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
      gsap.killTweensOf([spinnerRef.current, iconRef.current]);
    };
  }, []);

  return (
    <div className="simple-loading-overlay" ref={overlayRef}>
      <div className="simple-loading-container">
        <div className="simple-spinner" ref={spinnerRef}>
          <div className="spinner-ring"></div>
        </div>
        <div className="simple-loading-text" ref={textRef}>
          {text}
        </div>
      </div>
    </div>
  );
}

export default LoadingComponent;
