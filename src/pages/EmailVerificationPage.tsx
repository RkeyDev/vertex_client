import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

/**
 * Page responsible for processing the account verification token.
 * Uses a useRef lock to prevent double-execution in React Strict Mode.
 */
const EmailVerificationPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const isProcessing = useRef(false); // Execution Lock
    
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verifying your account...');

    useEffect(() => {
        // Prevent double-tapping the API
        if (isProcessing.current) return;

        const verifyAccount = async () => {
            const token = searchParams.get('token');
            const email = searchParams.get('email');

            if (!token || !email) {
                setStatus('error');
                setMessage('Invalid verification link. Missing token or email.');
                return;
            }

            try {
                isProcessing.current = true; // Set lock before request
                
                const response = await axios.post('http://localhost:8080/api/v1/auth/email-verification', {
                    verificationToken: token,
                    email: email
                });

                if (response.status === 200) {
                    setStatus('success');
                    setMessage('Your account has been verified successfully!');
                    
                    setTimeout(() => {
                        navigate('/login');
                    }, 4000);
                }
            } catch (error: any) {
                setStatus('error');
                const errorMsg = error.response?.data?.message || 'Verification failed. The link may be expired.';
                setMessage(errorMsg);
                console.error('Verification Error:', error);
            }
        };

        verifyAccount();
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center">
                
                {status === 'loading' && (
                    <div className="space-y-4">
                        <div className="animate-spin inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                        <h2 className="text-xl font-semibold text-gray-700">Validating...</h2>
                        <p className="text-gray-500">{message}</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-4">
                        <div className="bg-green-100 text-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                            <span className="text-3xl">✓</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Done!</h2>
                        <p className="text-gray-600">{message}</p>
                        <p className="text-sm text-gray-400">Redirecting you to login page...</p>
                        <Link to="/login" className="inline-block mt-4 text-blue-600 hover:underline font-medium">
                            Click here if you aren't redirected
                        </Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-4">
                        <div className="bg-red-100 text-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                            <span className="text-3xl">✕</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Verification Failed</h2>
                        <p className="text-gray-600">{message}</p>
                        <div className="pt-4 space-x-4">
                            <Link to="/register" className="text-blue-600 hover:underline font-medium">
                                Try Registering Again
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link to="/login" className="text-gray-600 hover:underline font-medium">
                                Back to Login
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmailVerificationPage;