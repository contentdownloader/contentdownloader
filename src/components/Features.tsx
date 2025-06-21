import React from 'react';
import { Shield, Zap, Download, Globe, Heart, Users } from 'lucide-react';

export const Features: React.FC = () => {
  const features = [
    {
      icon: <Download className="h-8 w-8" />,
      title: 'Multiple Content Types',
      description: 'Download posts, stories, reels, and highlights from Instagram and Facebook',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: 'Lightning Fast',
      description: 'High-speed downloads with optimized servers for the best performance',
      color: 'from-yellow-500 to-orange-500'
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: 'Safe & Secure',
      description: 'Your privacy is protected. We don\'t store your data or downloaded content',
      color: 'from-green-500 to-teal-500'
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: 'Public Content Only',
      description: 'Access only publicly available content while respecting privacy settings',
      color: 'from-blue-500 to-indigo-500'
    },
    {
      icon: <Heart className="h-8 w-8" />,
      title: 'Free to Use',
      description: 'Completely free service with no hidden fees or subscription requirements',
      color: 'from-red-500 to-pink-500'
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: 'User Friendly',
      description: 'Simple and intuitive interface designed for users of all technical levels',
      color: 'from-indigo-500 to-purple-500'
    }
  ];

  return (
    <section className="py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Why Choose Our Downloader?
        </h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Experience the most reliable and feature-rich social media content downloader
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <div
            key={index}
            className="group bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.color} text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {feature.title}
            </h3>
            <p className="text-gray-600 leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-center text-white">
        <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
        <p className="text-purple-100 mb-6 max-w-2xl mx-auto">
          Join thousands of users who trust our platform for downloading their favorite social media content safely and efficiently.
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>100% Safe</span>
          </div>
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>Super Fast</span>
          </div>
          <div className="flex items-center space-x-2">
            <Heart className="h-4 w-4" />
            <span>Always Free</span>
          </div>
        </div>
      </div>
    </section>
  );
};