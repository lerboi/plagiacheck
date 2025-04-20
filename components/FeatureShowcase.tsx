import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Search, Zap, Award } from 'lucide-react';

const features = [
  {
    icon: <Shield className="w-12 h-12 text-blue-500" />,
    title: 'Comprehensive Protection',
    description: 'Our advanced algorithms scan your text against billions of web pages and academic papers.'
  },
  {
    icon: <Search className="w-12 h-12 text-green-500" />,
    title: 'In-Depth Analysis',
    description: 'Get detailed reports on potential plagiarism, including source links and similarity percentages.'
  },
  {
    icon: <Zap className="w-12 h-12 text-yellow-500" />,
    title: 'Lightning Fast',
    description: 'Receive results in seconds, allowing you to quickly refine your work.'
  },
  {
    icon: <Award className="w-12 h-12 text-purple-500" />,
    title: 'Academic Standard',
    description: 'Trusted by students and professionals worldwide for maintaining academic integrity.'
  }
];

export const FeatureShowcase: React.FC = () => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose Our Plagiacheck?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 backdrop-blur-sm bg-white/5 dark:bg-gray-800/5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="flex flex-col items-center text-center">
                {feature.icon}
                <h3 className="mt-4 text-xl font-semibold">{feature.title}</h3>
                <p className="mt-2 text-gray-600 dark:text-gray-300">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
