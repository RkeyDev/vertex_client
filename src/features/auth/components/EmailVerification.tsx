import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const EmailVerification = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('Verifying...');

    useEffect(() => {
        const verify = async () => {
            const token = searchParams.get('token');
            const email = searchParams.get('email');

            try {
                // Sending the POST request your backend expects
                await axios.post('http://localhost:8080/api/auth/email-verification', {
                    verificationToken: token,
                    email: email
                });
                setStatus('Account verified successfully! You can now log in.');
            } catch (error) {
                setStatus('Verification failed. The link may be expired or invalid.');
            }
        };

        verify();
    }, [searchParams]);

    return (
        <div className="flex justify-center items-center h-screen">
            <h1 className="text-2xl font-bold">{status}</h1>
        </div>
    );
};