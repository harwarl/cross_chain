import React, { useEffect, useState } from "react";
import { FaArrowDown, FaTimes } from "react-icons/fa";
import Popup from "reactjs-popup";
import { getDestinationToken, getSourceToken } from "~~/services/store/helpers";

const SubmitButton = () => {
  const [open, setOpen] = useState<boolean>(false);
  const [progressOpen, setProgressOpen] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const closeModal = () => setOpen(false);
  const closeConfirmModal = () => setConfirmOpen(false);

  const sourceToken = getSourceToken();
  const destinationToken = getDestinationToken();
  const balanceToSwap = 50;
  const eta = "2 minutes";

  const handleConfirm = () => {
    setOpen(false); // Close the first popup
    setProgressOpen(true); // Open the progress bar popup

    // Simulate progress
    let progressValue = 0;
    const interval = setInterval(() => {
      progressValue += 10;
      setProgress(progressValue);

      if (progressValue >= 100) {
        clearInterval(interval);
        setProgressOpen(false); // Close progress bar popup
        setConfirmOpen(true); // Open success popup
      }
    }, 1000); // Adjust speed here (300ms per update)
  };

  return (
    <div className="w-full flex justify-center">
      <button
        className="btn btn-primary btn-md w-[85%] max-w-[650px] mt-6 py-4 rounded-md transition"
        onClick={() => setOpen(!open)}
      >
        Swap →
      </button>

      {/* Confirm Swap Popup */}
      <Popup open={open} closeOnDocumentClick onClose={closeModal}>
        <div className="flex flex-col w-96 p-6 bg-popbg border border-gray-700 text-slate-300 shadow-xl rounded-lg z-10">
          {/* Header */}
          <div className="flex flex-row justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Confirm Swap</h2>
            <button
              className="text-gray-400 hover:text-white transition-colors"
              onClick={() => setOpen(prev => !prev)}
              aria-label="Close"
            >
              <FaTimes size={20} />
            </button>
          </div>

          {/* Divider */}
          <div className="w-full border-t border-gray-600 mb-2"></div>

          {/* Source Token */}
          <div className="flex flex-row items-center justify-between mb-4">
            <div className="flex flex-row items-center space-x-4">
              <img
                src={sourceToken.logo}
                alt={`${sourceToken.symbol} logo`}
                className="w-10 h-10 rounded-full border border-gray-600"
              />
              <div>
                <p className="text-md text-white font-medium">
                  {balanceToSwap} {sourceToken.symbol}
                </p>
                <p className="text-sm text-gray-400">{sourceToken.chain}</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="flex justify-center items-center">
            <FaArrowDown size={20} />
          </div>

          {/* Destination Token */}
          <div className="flex flex-row items-center justify-between mb-6">
            <div className="flex flex-row items-center space-x-4">
              <img
                src={destinationToken.logo}
                alt={`${destinationToken.symbol} logo`}
                className="w-10 h-10 rounded-full border border-gray-600"
              />
              <div>
                <p className="text-md text-white font-medium">{destinationToken.symbol}</p>
                <p className="text-sm text-gray-400">{destinationToken.chain}</p>
              </div>
            </div>
          </div>

          {/* ETA */}
          <div className="text-sm text-gray-400 mb-6">
            Estimated time for completion: <span className="text-white">{eta}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-row justify-end mt-6 space-x-4">
            <button
              className="px-4 py-2 text-sm font-medium bg-gray-600 hover:bg-gray-500 rounded-md transition-colors"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary px-4 py-2 text-sm font-medium text-white rounded-md transition-colors"
              onClick={handleConfirm}
            >
              Confirm
            </button>
          </div>
        </div>
      </Popup>

      {/* Progress Bar Popup */}
      <Popup open={progressOpen} closeOnDocumentClick={false}>
        <div className="flex flex-col w-96 p-6 bg-popbg border border-gray-700 text-slate-300 shadow-xl rounded-lg z-10">
          <h2 className="text-lg font-semibold text-white mb-4">Processing Swap</h2>
          <div className="w-full bg-gray-600 rounded-full h-4 overflow-hidden">
            <div className="bg-primary h-4 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-sm text-gray-400 mt-4">
            Progress: <span className="text-white">{progress}%</span>
          </p>
        </div>
      </Popup>

      {/* Swap Success Popup */}
      <Popup open={confirmOpen} closeOnDocumentClick onClose={closeConfirmModal}>
        <div className="flex flex-col w-96 p-6 bg-popbg border border-gray-700 text-slate-300 shadow-xl rounded-lg z-10">
          {/* Header */}
          <div className="flex flex-row justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Swap Successful</h2>
            <button
              className="text-gray-400 hover:text-white transition-colors"
              onClick={() => setConfirmOpen(false)}
              aria-label="Close"
            >
              <FaTimes size={20} />
            </button>
          </div>

          {/* Success Message */}
          <div className="text-center text-white my-4">
            <p>
              You successfully swapped{" "}
              <strong>
                {balanceToSwap} {sourceToken.symbol}
              </strong>{" "}
              for <strong>{destinationToken.symbol}</strong>.
            </p>
            <p className="text-sm text-gray-400 mt-2">Transaction is now complete.</p>
          </div>

          {/* Action Button */}
          <div className="flex justify-center mt-6">
            <button
              className="btn btn-primary px-4 py-2 text-sm font-medium text-white rounded-md transition-colors"
              onClick={closeConfirmModal}
            >
              Close
            </button>
          </div>
        </div>
      </Popup>
    </div>
  );
};

export default SubmitButton;
