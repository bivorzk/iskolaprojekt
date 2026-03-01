window.MessageUtils = {

  groupMessages(messages) {
    if (!messages.length) return [];

    const grouped = [];
    let errorGroup = [];

    const flush = () => {
      if (!errorGroup.length) return;
      if (errorGroup.length === 1) {
        grouped.push(errorGroup[0]);
      } else {
        grouped.push({
          _id: `error_group_${errorGroup[0]._id}`,
          isErrorGroup: true,
          errorCount: errorGroup.length,
          firstError: errorGroup[0],
          lastError: errorGroup[errorGroup.length - 1],
          senderId: errorGroup[0].senderId,
          createdAt: errorGroup[errorGroup.length - 1].createdAt
        });
      }
      errorGroup = [];
    };

    for (const message of messages) {
      const isError =
        message.decryptedContent?.includes('[Key mismatch') ||
        message.decryptedContent?.includes('[Failed to decrypt]') ||
        message.decryptedContent?.includes('[Wrong device key');

      if (isError) {
        errorGroup.push(message);
      } else {
        flush();
        grouped.push(message);
      }
    }
    flush();
    return grouped;
  },

  // Returns true if the message content is a decryption error.
  isDecryptionError(content) {
    return (
      content?.includes('[Key mismatch') ||
      content?.includes('[Failed to decrypt]') ||
      content?.includes('[Failed to decrypt - try refreshing]')
    );
  },


  isWrongDeviceKey(content) {
    return content?.includes('[Wrong device key');
  },

  // Returns true if the message is from a previous key setup.
  isPreviousKeyMessage(content) {
    return content?.includes('[Message from previous encryption setup');
  }
};
