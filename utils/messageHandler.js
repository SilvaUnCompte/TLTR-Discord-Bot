/**
 * Utility for secure Discord message sending
 * Automatically handles Discord's 2000 character limit
 */

/**
 * Sends a message while automatically handling Discord's character limit
 * @param {Object} interaction - The Discord interaction
 * @param {string} content - The content to send
 * @param {Object} options - Configuration options
 * @param {string} options.prefix - Prefix for the first message (default: "")
 * @param {string} options.continuationPrefix - Prefix for continuation messages (default: "**...**")
 * @param {number} options.maxLength - Maximum length per message (default: 1900)
 * @param {boolean} options.useEditReply - Use editReply for the first message (default: true)
 */
async function sendDiscordMessage(interaction, content, options = {}) {
    const {
        prefix = '',
        continuationPrefix = '...',
        maxLength = 1900,
        useEditReply = true
    } = options;

    try {
        // If the message is short enough, send it directly
        const fullFirstMessage = prefix + content;
        if (fullFirstMessage.length <= maxLength) {
            if (useEditReply) {
                await interaction.editReply(fullFirstMessage);
            } else {
                await interaction.reply(fullFirstMessage);
            }
            return;
        }

        // Message too long - split it
        const availableLength = maxLength - prefix.length - continuationPrefix.length;
        const firstPartMaxSize = Math.min(availableLength, content.length);
        const firstPartCutPoint = findOptimalCutPoint(content, firstPartMaxSize);
        const firstPart = content.substring(0, firstPartCutPoint);
        const remainingContent = content.substring(firstPartCutPoint);

        // Send the first message with continuation prefix at the end if there's more content
        const firstMessage = remainingContent.length > 0 
            ? `${prefix}${firstPart}${continuationPrefix}`
            : `${prefix}${firstPart}`;
            
        if (useEditReply) {
            await interaction.editReply(firstMessage);
        } else {
            await interaction.reply(firstMessage);
        }

        // Split the rest into chunks and send them
        // Each chunk can use the full maxLength minus space for continuation prefix at the end (if needed)
        let currentPosition = 0;
        
        while (currentPosition < remainingContent.length) {
            const remainingText = remainingContent.substring(currentPosition);
            const willHaveNextChunk = currentPosition + maxLength < remainingContent.length;
            
            let chunkSize;
            let messageContent;
            
            if (willHaveNextChunk) {
                // Not the last chunk - add continuation prefix at the end
                const availableForContent = maxLength - continuationPrefix.length;
                chunkSize = findOptimalCutPoint(remainingText, availableForContent);
                const chunkContent = remainingText.substring(0, chunkSize);
                messageContent = `${chunkContent}${continuationPrefix}`;
            } else {
                // Last chunk - no continuation prefix needed
                chunkSize = remainingText.length;
                const chunkContent = remainingText;
                messageContent = chunkContent;
            }
            
            await interaction.followUp(messageContent);
            currentPosition += chunkSize;
        }

    } catch (error) {
        console.error('Error sending long message:', error);
        
        // Fallback in case of error
        const fallbackMessage = '❌ Error sending complete response.';
        try {
            if (useEditReply && !interaction.replied) {
                await interaction.editReply(fallbackMessage);
            } else {
                await interaction.followUp({ content: fallbackMessage, ephemeral: true });
            }
        } catch (fallbackError) {
            console.error('Fallback error:', fallbackError);
        }
        
        throw error;
    }
}

/**
 * Finds the optimal cut point in text to avoid splitting words
 * @param {string} text - The text to analyze
 * @param {number} maxLength - Maximum allowed length
 * @returns {number} - The optimal cut position
 */
function findOptimalCutPoint(text, maxLength) {
    if (text.length <= maxLength) {
        return text.length;
    }
    
    // Define break characters in order of preference
    const breakChars = [
        { chars: ['. ', '! ', '? '], priority: 1 }, // Sentence endings (highest priority)
        { chars: [', ', '; ', ': '], priority: 2 }, // Punctuation
        { chars: [' '], priority: 3 },              // Simple spaces
        { chars: ['\n', '\r'], priority: 4 }        // Line breaks
    ];
    
    let bestCutPoint = maxLength; // Fallback: cut at max length
    let bestPriority = 99;
    
    // Search backwards from maxLength to find the best break point
    for (let i = maxLength; i >= maxLength * 0.7; i--) { // Don't go below 70% of maxLength
        const currentChar = text[i];
        const nextChar = text[i + 1] || '';
        const twoCharSequence = currentChar + nextChar;
        
        // Check each priority level
        for (const breakGroup of breakChars) {
            // Check two-character sequences first
            if (breakGroup.chars.some(breakChar => breakChar.length === 2 && twoCharSequence === breakChar)) {
                if (breakGroup.priority < bestPriority) {
                    bestCutPoint = i + 2; // Include the break characters
                    bestPriority = breakGroup.priority;
                }
            }
            // Then check single characters
            else if (breakGroup.chars.some(breakChar => breakChar.length === 1 && currentChar === breakChar)) {
                if (breakGroup.priority < bestPriority) {
                    bestCutPoint = i + 1; // Include the break character
                    bestPriority = breakGroup.priority;
                }
            }
        }
        
        // If we found a sentence ending, that's optimal - stop searching
        if (bestPriority === 1) {
            break;
        }
    }
    
    return bestCutPoint;
}

/**
 * Splits text into chunks of maximum size
 * @param {string} text - The text to split
 * @param {number} maxLength - Maximum size of each chunk
 * @returns {string[]} - Array of chunks
 */
function splitIntoChunks(text, maxLength) {
    const chunks = [];
    
    for (let i = 0; i < text.length; i += maxLength) {
        chunks.push(text.substring(i, i + maxLength));
    }
    
    return chunks;
}

/**
 * Sends a formatted error response
 * @param {Object} interaction - The Discord interaction
 * @param {string} errorMessage - The error message (optional)
 */
async function sendDiscordErrorMessage(interaction, errorMessage = "An error occurred.") {
    const formattedError = `❌ ${errorMessage}`;
    
    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(formattedError);
        } else {
            await interaction.reply({ content: formattedError, ephemeral: true });
        }
    } catch (error) {
        console.error('Error sending error message:', error);
    }
}


module.exports = {
    sendDiscordMessage,
    sendDiscordErrorMessage,
    splitIntoChunks,
    findOptimalCutPoint
};