
import React from 'react';
import { scrollToClauseByNumber } from '../../utils/navigation';
import { LinkToken } from '../../utils/clauseTokenizer';

interface TokenizedTextRendererProps {
    tokens: LinkToken[] | null;
    rawText: string;
    className?: string;
    onClick?: () => void;
}

/**
 * Renders text from tokens if available, otherwise raw text.
 * Handles clicking on 'ref' tokens to scroll to clauses.
 */
export const TokenizedTextRenderer: React.FC<TokenizedTextRendererProps> = ({
    tokens,
    rawText,
    className = '',
    onClick
}) => {
    if (!tokens || tokens.length === 0) {
        return (
            <div className={className} onClick={onClick}>
                {rawText}
            </div>
        );
    }

    return (
        <div className={className} onClick={onClick}>
            {tokens.map((token, index) => {
                if (token.t === 'ref') {
                    return (
                        <button
                            key={index}
                            onClick={(e) => {
                                e.stopPropagation();
                                // Strip parens if they somehow remained or just strict number
                                // The tokenizer should have stripped parens.
                                scrollToClauseByNumber(token.v);
                            }}
                            className="clause-ref inline-block text-blue-600 hover:text-blue-800 hover:underline font-medium bg-transparent border-0 p-0 cursor-pointer"
                            title={`Go to Clause ${token.v}`}
                        >
                            {token.v}
                        </button>
                    );
                }
                return <span key={index}>{token.v}</span>;
            })}
        </div>
    );
};
