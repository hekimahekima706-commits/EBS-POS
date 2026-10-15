import React from 'react';
import { VoiceSalesAssistantModal } from './VoiceSalesAssistantModal';
import { Sale } from '../types';

export interface VoicePOSProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteSaleSuccess?: (completedSale: Sale) => void;
  onOpenReceipt?: (sale: Sale) => void;
}

export const VoicePOS: React.FC<VoicePOSProps> = (props) => {
  return <VoiceSalesAssistantModal {...props} />;
};

export { VoiceSalesAssistantModal };
export default VoicePOS;
