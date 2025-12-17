import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface HeroProps {
  onTryFreeClick?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onTryFreeClick }) => {
  return (
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          <motion.div
            className="w-full lg:w-1/2 text-center lg:text-left"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 md:mb-6 leading-tight">
              Ensure Your Work is{' '}
              <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                100% Original
              </span>
            </h1>
            <p className="text-lg md:text-xl mb-6 md:mb-8 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto lg:mx-0">
              Our AI-powered plagiarism checker helps you maintain academic integrity and improve your writing with instant, accurate results.
            </p>
            
            {/* Feature List */}
            <div className="space-y-3 md:space-y-4 mb-8">
              {[
                'Check against billions of sources', 
                'Get instant results', 
                'Improve your writing quality'
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className="flex items-center justify-center lg:justify-start"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <CheckCircle className="mr-3 h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-200 text-sm md:text-base">{item}</span>
                </motion.div>
              ))}
            </div>

            {/* CTA Buttons */}
            <motion.div
              className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center lg:justify-start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <button
                onClick={onTryFreeClick}
                className="px-6 md:px-8 py-3 md:py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors duration-200 text-sm md:text-base"
              >
                Try Free Now
              </button>
              <Link
                href="/pricing"
                className="px-6 md:px-8 py-3 md:py-4 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold rounded-lg transition-colors duration-200 text-sm md:text-base text-center"
              >
                View Pricing
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            className="w-full lg:w-1/2 mt-8 lg:mt-0"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="relative">
              <img
                src="/herobg.jpg"
                alt="Plagiarism Checker Illustration"
                className="w-full h-auto rounded-lg md:rounded-xl shadow-2xl max-w-lg mx-auto lg:max-w-none"
              />

              <motion.div 
                className="absolute -bottom-4 -right-4 md:-bottom-6 md:-right-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 md:p-4 border"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.0 }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 md:w-3 md:h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-xs md:text-sm font-medium">Instant Results</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};