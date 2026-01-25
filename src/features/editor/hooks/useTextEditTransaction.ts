import { useEffect } from "react";

type TextEditTransactionParams = {
  editingTextId: string | null;
  beginTransaction: () => void;
  commitTransaction: (label?: string) => void;
};

export const useTextEditTransaction = ({
  editingTextId,
  beginTransaction,
  commitTransaction,
}: TextEditTransactionParams) => {
  useEffect(() => {
    if (editingTextId) {
      beginTransaction();
      return;
    }
    commitTransaction("Text edit");
  }, [editingTextId, beginTransaction, commitTransaction]);
};
