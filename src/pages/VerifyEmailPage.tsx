import React from 'react';

const VerifyEmailPage: React.FC = () => {
  const handleResend = () => {
    console.log("Resending verification link...");
    // Trigger your authApi.resendVerification(email) here
  };

  return (
    <div className="vertex-auth-screen flex items-center justify-center min-h-screen">
      {/* Same card style and fixed size for consistency */}
      <div className="bg-[#EAEAEA] p-10 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col items-center relative min-h-[700px]">
        
        {/* Content Wrapper focused in the center */}
        <div className="flex-1 flex flex-col justify-center items-center w-full px-12 text-center">
          <h1 className="text-5xl font-bold mb-12 text-[#222]">
            Verify Your Email Address
          </h1>
          
          <p className="text-xl font-bold text-[#333] leading-relaxed max-w-md mb-16">
            A verification link has sent to your inbox. Please open it to continue
          </p>
          
          <button 
            onClick={handleResend}
            className="bg-[#539160] hover:bg-[#467a51] text-white font-bold py-3 px-12 rounded-lg text-2xl shadow-md transition-all active:scale-95"
          >
            Resend Link
          </button>
        </div>

        {/* Footer Support Link positioned exactly like the Sign In/Up links */}
        <div className="absolute bottom-6 left-12 text-lg font-bold text-gray-800">
          Still having troubles? <a href="/contact" className="text-blue-500 hover:underline">Contact us</a>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;