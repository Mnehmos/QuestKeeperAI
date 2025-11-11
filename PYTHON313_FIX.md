# Python 3.13 Compatibility Fix

## Issue
If you're running Python 3.13 and see this error when starting the backend:

```
AssertionError: Class <class 'sqlalchemy.sql.elements.SQLCoreOperations'> directly inherits TypingOnly but has additional attributes {'__firstlineno__', '__static_attributes__'}.
```

This is caused by SQLAlchemy 2.0.23 not being compatible with Python 3.13's new `__static_attributes__` feature.

## Quick Fix

Run this command in your `python_backend` directory:

```bash
pip install --upgrade sqlalchemy>=2.0.25
```

Or reinstall all dependencies:

```bash
pip install -r requirements.txt --upgrade
```

## Explanation

Python 3.13 introduced a new `__static_attributes__` attribute for classes. SQLAlchemy 2.0.23 and earlier versions don't account for this, causing the error. SQLAlchemy 2.0.25+ includes the fix.

## Verification

After upgrading, verify it works:

```bash
cd python_backend
python main.py
```

You should see:
```
 * Running on http://127.0.0.1:5001
```

## Alternative: Use Python 3.12

If you prefer not to upgrade dependencies, you can use Python 3.12 instead:

```bash
# Using pyenv
pyenv install 3.12.1
pyenv local 3.12.1

# Or use a virtual environment with Python 3.12
python3.12 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Related Issues

- [SQLAlchemy Issue #10570](https://github.com/sqlalchemy/sqlalchemy/issues/10570)
- Python 3.13 Release Notes on `__static_attributes__`

---

**Last Updated**: 2025-11-11
**Fixed In**: SQLAlchemy 2.0.25+
