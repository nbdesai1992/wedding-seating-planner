"""Claude API client service.

Wraps the Anthropic Python SDK to provide a simple interface for calling
Claude with a system prompt and user message.
"""

from __future__ import annotations

import os
from typing import Optional

import anthropic


def get_anthropic_client() -> anthropic.Anthropic:
    """Create an Anthropic client using the ANTHROPIC_API_KEY env var."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY environment variable is required for AI features"
        )
    return anthropic.Anthropic(api_key=api_key)


def call_claude(
    system_prompt: str,
    user_message: str,
    model: str = "claude-sonnet-4-6",
    max_tokens: int = 4096,
    client: Optional[anthropic.Anthropic] = None,
) -> str:
    """Call the Claude API and return the text response.

    Args:
        system_prompt: Instructions for Claude's behavior.
        user_message: The user's input/request.
        model: Which Claude model to use. Defaults to claude-sonnet-4-6.
        max_tokens: Maximum tokens in the response.
        client: Optional pre-configured Anthropic client (for testing).

    Returns:
        The text content of Claude's response.

    Raises:
        RuntimeError: If ANTHROPIC_API_KEY is not set.
        anthropic.APIError: If the API call fails.
    """
    if client is None:
        client = get_anthropic_client()

    message = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[
            {"role": "user", "content": user_message},
        ],
    )

    # Extract text from the response
    return message.content[0].text
