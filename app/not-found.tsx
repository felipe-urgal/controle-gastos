"use client"

import Link from "next/link";
import { useEffect, useState } from "react";

export default function NotFound() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="min-vh-100 bg-dark text-light position-relative overflow-hidden">
      {/* Efeito de gradiente com mouse */}
      <div 
        className="position-absolute top-0 start-0 w-100 h-100 opacity-25 pointer-events-none"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(59, 130, 246, 0.15), transparent 40%)`
        }}
      />
      
      {/* Background pattern */}
      <div className="position-absolute top-0 start-0 w-100 h-100 opacity-5 bg-pattern" />
      
      {/* Conteúdo principal */}
      <div className="position-relative z-3 d-flex flex-column align-items-center justify-content-center min-vh-100 px-3 py-5">
        <div className="text-center w-100" style={{ maxWidth: '600px' }}>
          {/* Número 404 */}
          <div className="position-relative mb-5">
            <h1 className="display-1 fw-bolder text-primary bg-gradient-text">
              404
            </h1>
            <div className="position-absolute top-0 start-0 w-100 h-100 text-primary opacity-75 blur-effect">
              404
            </div>
          </div>

          {/* Título */}
          <h2 className="h1 fw-semibold mb-4 text-white">
            Oops! Página não encontrada
          </h2>

          {/* Descrição */}
          <p className="fs-5 text-light-emphasis mb-5 lh-base mx-auto" style={{ maxWidth: '400px' }}>
            A página que você está procurando não existe, foi removida ou o endereço pode estar incorreto.
          </p>

          {/* Botões */}
          <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center align-items-center mb-5">
            <Link 
              href="/"
              className="btn btn-primary btn-lg px-5 py-3 fw-medium rounded-3 shadow hover-scale"
            >
              <span>Voltar para o Início</span>
            </Link>

            <button 
              onClick={() => window.history.back()}
              className="btn btn-outline-light btn-lg px-4 py-3 fw-medium rounded-3 hover-scale"
            >
              <span className="me-2">←</span>
              Voltar
            </button>
          </div>

          {/* Loading dots */}
          <div className="d-flex justify-content-center gap-2 mt-5">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="rounded-circle bg-secondary loading-dot"
                style={{ 
                  width: '8px', 
                  height: '8px',
                  animationDelay: `${i * 0.2}s`
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Elementos decorativos */}
      <div className="position-absolute top-25 end-n5 w-100 h-100 bg-primary rounded-circle blur-xl opacity-10 pulse-slow" 
           style={{ maxWidth: '384px', maxHeight: '384px' }} />
      <div className="position-absolute bottom-25 start-n5 w-100 h-100 bg-purple rounded-circle blur-xl opacity-10 pulse-slow" 
           style={{ maxWidth: '384px', maxHeight: '384px' }} />
      
      <style jsx>{`
        .bg-pattern {
          background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCI+PHBhdGggZD0iTTAgMGg1MHY1MEgweiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utb3BhY2l0eT0iMC4xIiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4=');
        }
        
        .bg-gradient-text {
          background: linear-gradient(to right, #3b82f6, #8b5cf6);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        
        .blur-effect {
          filter: blur(12px);
        }
        
        .hover-scale {
          transition: all 0.3s ease;
        }
        
        .hover-scale:hover {
          transform: scale(1.05);
        }
        
        .loading-dot {
          animation: bounce 1.4s infinite ease-in-out;
        }
        
        .pulse-slow {
          animation: pulse 4s infinite ease-in-out;
        }
        
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 0.1;
          }
          50% {
            opacity: 0.15;
          }
        }
        
        .bg-purple {
          background-color: #8b5cf6;
        }
        
        .blur-xl {
          filter: blur(64px);
        }
        
        .end-n5 {
          right: -8rem;
        }
        
        .start-n5 {
          left: -8rem;
        }
      `}</style>
    </div>
  );
}
