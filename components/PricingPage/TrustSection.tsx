import { Card, CardContent } from "@/components/ui/card"
import { Shield, Users, Award, Clock, CheckCircle, Star, ArrowRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { motion } from "framer-motion"

export function TrustSection() {
  const stats = [
    {
      icon: Users,
      number: "10M+",
      label: "Documents Checked"
    },
    {
      icon: Shield,
      number: "99.9%",
      label: "Accuracy Rate"
    },
    {
      icon: Clock,
      number: "< 30s",
      label: "Average Check Time"
    },
    {
      icon: Award,
      number: "500+",
      label: "Universities Trust Us"
    }
  ]

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Graduate Student",
      content: "This plagiarism checker saved my thesis. The accuracy is incredible.",
      rating: 5
    },
    {
      name: "Dr. Rodriguez",
      role: "Professor",
      content: "I recommend this to all my students. Great detailed reports.",
      rating: 5
    },
    {
      name: "Emma Thompson",
      role: "Content Writer",
      content: "As a freelancer, this tool gives me confidence in every submission.",
      rating: 5
    }
  ]

  const features = [
    {
      icon: CheckCircle,
      title: "Real-time Scanning",
      description: "Check against billions of sources instantly"
    },
    {
      icon: Shield,
      title: "Privacy Protected",
      description: "Your documents are secure and never stored"
    },
    {
      icon: Award,
      title: "Citation Assistant",
      description: "Get proper citation suggestions"
    }
  ]

  return (
    <div className="py-20">
      <div className="container max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-bold tracking-tight mb-4 bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
            Trusted Worldwide
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join millions who trust our advanced plagiarism detection technology
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          {stats.map((stat, index) => {
            const IconComponent = stat.icon
            return (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="text-center p-6 h-full border-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="mb-4 flex justify-center">
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-foreground mb-2">{stat.number}</div>
                    <div className="font-medium text-muted-foreground text-sm">{stat.label}</div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Features */}
        <motion.div 
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <h3 className="text-3xl font-bold text-center mb-12">Powerful Features</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon
              return (
                <motion.div
                  key={index}
                  className="text-center group"
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="mb-6 flex justify-center">
                    <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl group-hover:shadow-lg transition-shadow duration-300">
                      <IconComponent className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <h4 className="text-xl font-semibold mb-3">{feature.title}</h4>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Testimonials */}
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <h3 className="text-3xl font-bold text-center mb-12">What Users Say</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="p-6 h-full border-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="flex mb-4">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <blockquote className="text-muted-foreground mb-4 italic leading-relaxed">
                      "{testimonial.content}"
                    </blockquote>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div className="font-semibold text-foreground">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
        >
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent"></div>
            <CardContent className="relative p-12">
              <h3 className="text-3xl font-bold mb-4">Ready to Get Started?</h3>
              <p className="text-blue-100 mb-8 text-lg max-w-2xl mx-auto">
                Join millions of users who trust our plagiarism detection technology
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
                <div className="flex items-center gap-2 text-blue-100">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">No credit card required</span>
                </div>
                <div className="flex items-center gap-2 text-blue-100">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Instant results</span>
                </div>
                <div className="flex items-center gap-2 text-blue-100">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Secure & private</span>
                </div>
              </div>
              <Button 
                asChild
                className="bg-white text-blue-600 hover:bg-gray-50 font-semibold px-8 py-3 h-auto text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Link href="/pricing" className="inline-flex items-center gap-2">
                  Start Now
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}