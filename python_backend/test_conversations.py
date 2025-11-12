#!/usr/bin/env python3
"""
Test script for conversation management Phase 1
"""

import sys
sys.path.insert(0, '/home/user/QuestKeeperAI/python_backend')

from app.models.database import Conversation, Message, get_or_create_session, init_db
from app.services.token_counter import token_counter
from datetime import datetime

def test_conversation_creation():
    """Test creating a conversation"""
    print("\n=== Test 1: Create Conversation ===")

    # Initialize database
    init_db("sqlite:///test_conversations.db")
    session = get_or_create_session()

    try:
        # Create conversation
        conv = Conversation(
            title="Test Conversation",
            character_id=None
        )
        session.add(conv)
        session.commit()

        print(f"✓ Created conversation: {conv.id}")
        print(f"  Title: {conv.title}")
        print(f"  Created: {conv.created_at}")

        return conv.id
    finally:
        session.close()

def test_message_creation(conversation_id):
    """Test adding messages to conversation"""
    print("\n=== Test 2: Add Messages ===")

    session = get_or_create_session()

    try:
        # Get conversation
        conv = session.query(Conversation).filter_by(id=conversation_id).first()

        # Add user message
        user_msg = Message(
            conversation_id=conv.id,
            role="user",
            content="Hello, how are you?"
        )
        session.add(user_msg)

        # Add assistant message
        assistant_msg = Message(
            conversation_id=conv.id,
            role="assistant",
            content="I'm doing great! How can I help you today?"
        )
        session.add(assistant_msg)

        session.commit()

        print(f"✓ Added 2 messages to conversation {conv.id}")
        print(f"  User: {user_msg.content[:50]}")
        print(f"  Assistant: {assistant_msg.content[:50]}")

        # Refresh to get updated messages
        session.refresh(conv)
        print(f"  Total messages: {len(conv.messages)}")

    finally:
        session.close()

def test_token_counting(conversation_id):
    """Test token counting"""
    print("\n=== Test 3: Token Counting ===")

    session = get_or_create_session()

    try:
        conv = session.query(Conversation).filter_by(id=conversation_id).first()

        # Build message list for token counting
        messages = [
            {"role": msg.role, "content": msg.content}
            for msg in conv.messages
        ]

        # Count tokens
        total_tokens = token_counter.count_messages(messages, model="claude-sonnet-4")

        print(f"✓ Token counting complete")
        print(f"  Messages: {len(messages)}")
        print(f"  Total tokens: {total_tokens}")

        # Update conversation
        conv.total_tokens = total_tokens
        session.commit()

        print(f"  Updated conversation token count")

    finally:
        session.close()

def test_conversation_retrieval(conversation_id):
    """Test retrieving conversation with messages"""
    print("\n=== Test 4: Retrieve Conversation ===")

    session = get_or_create_session()

    try:
        conv = session.query(Conversation).filter_by(id=conversation_id).first()

        print(f"✓ Retrieved conversation: {conv.id}")
        print(f"  Title: {conv.title}")
        print(f"  Messages: {len(conv.messages)}")
        print(f"  Total tokens: {conv.total_tokens}")

        print("\n  Message history:")
        for msg in conv.messages:
            preview = msg.content[:50] + "..." if len(msg.content) > 50 else msg.content
            print(f"    [{msg.role}] {preview}")

    finally:
        session.close()

def test_conversation_dict():
    """Test to_dict methods"""
    print("\n=== Test 5: Serialization ===")

    session = get_or_create_session()

    try:
        conv = session.query(Conversation).first()

        conv_dict = conv.to_dict()
        print(f"✓ Conversation to_dict():")
        for key, value in conv_dict.items():
            print(f"    {key}: {value}")

        if conv.messages:
            msg_dict = conv.messages[0].to_dict()
            print(f"\n✓ Message to_dict():")
            for key, value in msg_dict.items():
                if key == 'content':
                    value = value[:50] + "..." if len(value) > 50 else value
                print(f"    {key}: {value}")

    finally:
        session.close()

def test_model_limits():
    """Test token counter model limits"""
    print("\n=== Test 6: Model Limits ===")

    models = [
        "claude-sonnet-4",
        "gpt-4-turbo",
        "gemini-2.5-pro",
        "unknown-model"
    ]

    for model in models:
        limit = token_counter.get_model_limit(model)
        threshold = token_counter.get_condensation_threshold(model)
        print(f"  {model:20} → {limit:>8} tokens (condense at {threshold:>8})")

def main():
    """Run all tests"""
    print("=" * 60)
    print("Phase 1 Conversation Management Tests")
    print("=" * 60)

    try:
        # Run tests
        conv_id = test_conversation_creation()
        test_message_creation(conv_id)
        test_token_counting(conv_id)
        test_conversation_retrieval(conv_id)
        test_conversation_dict()
        test_model_limits()

        print("\n" + "=" * 60)
        print("✓ All tests passed!")
        print("=" * 60)

    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
