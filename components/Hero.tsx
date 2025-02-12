import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center">
          <motion.div
            className="lg:w-1/2 mb-10 lg:mb-0"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              Ensure Your Work is 100% Original
            </h1>
            <p className="text-xl mb-6 text-gray-600 dark:text-gray-300">
              Our AI-powered plagiarism checker helps you maintain academic integrity and improve your writing.
            </p>
            <ul className="space-y-2">
              {['Check against billions of sources', 'Get instant results', 'Improve your writing'].map((item, index) => (
                <motion.li
                  key={index}
                  className="flex items-center"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <CheckCircle className="mr-2 text-green-500" />
                  <span className="text-gray-700 dark:text-gray-200">{item}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
          <motion.div
            className="lg:w-1/2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <img
              src="/herobg.jpg"
              alt="Plagiarism Checker Illustration"
              className="rounded-lg shadow-2xl"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};
