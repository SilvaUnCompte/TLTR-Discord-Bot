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
        maxLength = 1990,
        useEditReply = true,
        ephemeral = false
    } = options;

    try {
        // If the message is short enough, send it directly
        const fullFirstMessage = prefix + content;
        if (fullFirstMessage.length <= maxLength) {
            if (useEditReply) {
                await interaction.editReply(fullFirstMessage);
            } else {
                await interaction.followUp({ content: fullFirstMessage, ephemeral: ephemeral });
            }
            return;
        }

        // Message too long - split it
        const availableLength = maxLength - prefix.length - continuationPrefix.length;
        const firstPartMaxSize = Math.min(availableLength, content.length);
        const cutInfo = findOptimalCutPoint(content, firstPartMaxSize);
        
        let firstPart = content.substring(0, cutInfo.cutPoint);
        let remainingContent = content.substring(cutInfo.cutPoint);
        
        // Handle code block fixes if needed
        if (cutInfo.needsCodeBlockFix) {
            // Close the code block in the first part
            firstPart += '\n```';
            // Reopen the code block in the remaining content
            remainingContent = '```' + cutInfo.codeBlockLang + '\n' + remainingContent;
        }

        // Send the first message with continuation prefix at the end if there's more content
        const firstMessage = remainingContent.length > 0 
            ? `${prefix}${firstPart}${continuationPrefix}`
            : `${prefix}${firstPart}`;
            
        if (useEditReply) {
            await interaction.editReply(firstMessage);
        } else {
            await interaction.followUp({ content: firstMessage, ephemeral: ephemeral });
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
                const chunkCutInfo = findOptimalCutPoint(remainingText, availableForContent);
                chunkSize = chunkCutInfo.cutPoint;
                
                let chunkContent = remainingText.substring(0, chunkSize);
                
                // Handle code block fixes if needed
                if (chunkCutInfo.needsCodeBlockFix) {
                    chunkContent += '\n```';
                    
                    // Prepare the remaining content with reopened code block
                    const afterCut = remainingText.substring(chunkSize);
                    remainingContent = remainingContent.substring(0, currentPosition + chunkSize) +
                                     '```' + chunkCutInfo.codeBlockLang + '\n' + afterCut;
                }
                
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
 * Finds the optimal cut point in text to avoid splitting words and code blocks
 * @param {string} text - The text to analyze
 * @param {number} maxLength - Maximum allowed length
 * @returns {Object} - { cutPoint: number, needsCodeBlockFix: boolean, codeBlockLang: string }
 */
function findOptimalCutPoint(text, maxLength) {
    if (text.length <= maxLength) {
        return { cutPoint: text.length, needsCodeBlockFix: false, codeBlockLang: '' };
    }
    
    // Check if we're inside a code block at the cut point
    const codeBlockInfo = analyzeCodeBlocks(text, maxLength);
    
    // If we're inside a code block, find a safe cut point
    if (codeBlockInfo.insideCodeBlock) {
        const safePoint = findSafeCutPointAroundCodeBlock(text, maxLength, codeBlockInfo);
        return safePoint;
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
    
    return { cutPoint: bestCutPoint, needsCodeBlockFix: false, codeBlockLang: '' };
}

/**
 * Analyzes if a position is inside a code block
 * @param {string} text - The text to analyze
 * @param {number} position - The position to check
 * @returns {Object} - Information about code blocks
 */
function analyzeCodeBlocks(text, position) {
    const codeBlockRegex = /```(\w*)\n/g;
    let match;
    let insideCodeBlock = false;
    let currentBlockStart = -1;
    let currentBlockLang = '';
    
    // Find all code block starts
    while ((match = codeBlockRegex.exec(text)) !== null) {
        const blockStart = match.index;
        const blockLang = match[1] || '';
        
        if (blockStart < position) {
            // Look for the closing ``` after this opening
            const closingRegex = /```/g;
            closingRegex.lastIndex = match.index + match[0].length;
            const closingMatch = closingRegex.exec(text);
            
            if (closingMatch && closingMatch.index > position) {
                // We're inside this code block
                insideCodeBlock = true;
                currentBlockStart = blockStart;
                currentBlockLang = blockLang;
                break;
            } else if (!closingMatch) {
                // Unclosed code block
                insideCodeBlock = true;
                currentBlockStart = blockStart;
                currentBlockLang = blockLang;
                break;
            }
        } else {
            break; // Past our position
        }
    }
    
    return {
        insideCodeBlock,
        blockStart: currentBlockStart,
        blockLang: currentBlockLang
    };
}

/**
 * Finds a safe cut point around code blocks
 * @param {string} text - The text to analyze
 * @param {number} maxLength - Maximum allowed length
 * @param {Object} codeBlockInfo - Information about the code block
 * @returns {Object} - Safe cut point information
 */
function findSafeCutPointAroundCodeBlock(text, maxLength, codeBlockInfo) {
    // Strategy 1: Try to cut before the code block
    if (codeBlockInfo.blockStart > maxLength * 0.5) {
        // Find a good break point before the code block
        const beforeBlock = text.substring(0, codeBlockInfo.blockStart);
        const cutPoint = findOptimalCutPoint(beforeBlock, Math.min(beforeBlock.length, maxLength));
        if (cutPoint.cutPoint > maxLength * 0.5) {
            return { cutPoint: cutPoint.cutPoint, needsCodeBlockFix: false, codeBlockLang: '' };
        }
    }
    
    // Strategy 2: Find the end of the code block and cut after it
    const blockStartMatch = text.substring(codeBlockInfo.blockStart).match(/```(\w*)\n/);
    if (blockStartMatch) {
        const searchStart = codeBlockInfo.blockStart + blockStartMatch[0].length;
        const closingMatch = text.substring(searchStart).match(/```/);
        
        if (closingMatch) {
            const blockEnd = searchStart + closingMatch.index + 3; // Include the closing ```
            if (blockEnd <= maxLength * 1.2) { // Allow some flexibility
                return { cutPoint: blockEnd, needsCodeBlockFix: false, codeBlockLang: '' };
            }
        }
    }
    
    // Strategy 3: We must cut inside the code block - add closing and reopening
    const cutPoint = Math.min(maxLength - 10, text.length); // Leave space for ```
    return {
        cutPoint: cutPoint,
        needsCodeBlockFix: true,
        codeBlockLang: codeBlockInfo.blockLang
    };
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