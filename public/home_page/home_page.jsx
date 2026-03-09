import { createRoot } from 'react-dom/client';
import '../styles/index.css';

import React, { useState } from 'react';

const HomePage = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-accent to-white">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="flex justify-between items-center py-4 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center space-x-4">
                        <a href="/">
                        <svg viewBox="0 0 500 140" className="h-20 w-auto">
                            <rect x="25" y="55" width="90" height="50" rx="6" fill="#FF6B35"/>
                            <rect x="30" y="60" width="35" height="40" rx="3" fill="#FFE5DC"/>
                            <rect x="70" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                            <rect x="95" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                            <rect x="70" y="82" width="45" height="18" rx="3" fill="#FFE5DC"/>
                            <path d="M80 25 L65 52 L75 52 L60 80 L85 50 L75 50 L90 25 Z" fill="#FFC857" stroke="#FF6B35" strokeWidth="2" strokeLinejoin="round"/>
                            <text x="150" y="85" fontFamily="system-ui, -apple-system, sans-serif" fontSize="32" fontWeight="bold" fill="#FF6B35" letterSpacing="-1">SnapTray</text>
                            <text x="150" y="105" fontFamily="system-ui, -apple-system, sans-serif" fontSize="20" fill="#6C757D" letterSpacing="2">CAFETERIA ORDERING</text>
                        </svg>
                        </a>
                    </div>
                    <div className="flex items-center space-x-4">
                        <a href="/login" className="text-primary hover:text-secondary font-medium transition-colors">Login</a>
                        <a href="/register" className="bg-primary text-white px-4 py-2 rounded-md hover:bg-secondary transition-colors">Get Started</a>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                        Welcome to <span className="text-primary">SnapTray</span>
                    </h1>
                    <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                        The modern cafeteria ordering system that makes getting your favorite meals quick, easy, and delicious.
                        Order ahead, pay securely, and enjoy your food without the wait.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="/Order/"
                            className="bg-primary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-secondary transition-colors shadow-lg"
                        >
                            Order Food Now
                        </a>
                        <a
                            href="/register"
                            className="border-2 border-primary text-primary px-8 py-4 rounded-lg text-lg font-semibold hover:bg-accent transition-colors"
                        >
                            Create Account
                        </a>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose SnapTray?</h2>
                        <p className="text-lg text-gray-600">Experience the future of cafeteria dining</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Lightning Fast</h3>
                            <p className="text-gray-600">Order and pay in seconds with our streamlined interface</p>
                        </div>
                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure Payments</h3>
                            <p className="text-gray-600">Multiple payment options including wallet, PayPal, and Google Pay</p>
                        </div>
                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Fresh & Quality</h3>
                            <p className="text-gray-600">Carefully selected menu items with detailed nutritional information</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 bg-gradient-to-r from-primary to-secondary">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
                    <p className="text-xl text-white/90 mb-8">Join thousands of satisfied students and staff</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="/register"
                            className="bg-white text-primary px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors"
                        >
                            Sign Up Free
                        </a>
                        <a
                            href="/login"
                            className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/10 transition-colors"
                        >
                            Login
                        </a>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-8">
                        <div className="col-span-2">
                            <svg viewBox="0 0 500 140" className="h-24 w-auto mb-4">
                                <rect x="25" y="55" width="90" height="50" rx="6" fill="#FF6B35"/>
                                <rect x="30" y="60" width="35" height="40" rx="3" fill="#FFE5DC"/>
                                <rect x="70" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                                <rect x="95" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
                                <rect x="70" y="82" width="45" height="18" rx="3" fill="#FFE5DC"/>
                                <path d="M80 25 L65 52 L75 52 L60 80 L85 50 L75 50 L90 25 Z" fill="#FFC857" stroke="#FF6B35" strokeWidth="2" strokeLinejoin="round"/>
                                <text x="150" y="85" fontFamily="system-ui, -apple-system, sans-serif" fontSize="24" fontWeight="bold" fill="#FF6B35" letterSpacing="-1">SnapTray</text>
                                <text x="150" y="105" fontFamily="system-ui, -apple-system, sans-serif" fontSize="16" fill="#6C757D" letterSpacing="2">CAFETERIA ORDERING</text>
                            </svg>
                            <p className="text-gray-300">Making cafeteria dining convenient and enjoyable for everyone.</p>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4 text-gray">Quick Links</h3>
                            <ul className="space-y-2">
                                <li><a href="/Order/" className="text-gray-300 hover:text-secondary transition-colors">Order Food</a></li>
                                <li><a href="/register" className="text-gray-300 hover:text-secondary transition-colors">Register</a></li>
                                <li><a href="/login" className="text-gray-300 hover:text-secondary transition-colors">Login</a></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4 text-white">Support</h3>
                            <ul className="space-y-2">
                                <li><a href="/dashboard/student/" className="text-gray-300 hover:text-secondary transition-colors">Student Dashboard</a></li>
                                <li><a href="/dashboard/admin" className="text-gray-300 hover:text-secondary transition-colors">Admin Dashboard</a></li>
                                <li><a href="/password-reset" className="text-gray-300 hover:text-secondary transition-colors">Reset Password</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-700 mt-8 pt-8 text-center">
                        <p className="text-gray-300">
                            © 2026 SnapTray. All rights reserved. |
                            <span className="text-secondary font-medium"> Cafeteria Ordering System</span>
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

createRoot(document.getElementById('root')).render(<HomePage />);