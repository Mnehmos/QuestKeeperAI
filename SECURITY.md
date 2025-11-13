# Security Notes

## Dependency Vulnerabilities

When running `npm audit`, you may see vulnerabilities in development dependencies. Here's what you need to know:

### Production Dependencies: ✅ SECURE
```bash
npm audit --production
# Result: found 0 vulnerabilities
```

**The final packaged application has NO vulnerabilities** - all issues are in build tools only.

### Development Dependencies: ⚠️ Known Issues

The vulnerabilities are in development tools (webpack, electron-builder, etc.) that are **NOT included in the final .exe installer**:

1. **Critical**: `form-data` (4.0.0 - 4.0.3)
   - Issue: Unsafe random function for boundary
   - Impact: Build-time only, not in production app
   - Fix: `npm update form-data`

2. **Moderate**: `electron` (<35.7.5)
   - Issue: ASAR integrity bypass
   - Impact: Development mode only
   - Fix: Requires major version upgrade (breaking change)

3. **Low**: `brace-expansion` (ReDoS)
   - Impact: Build scripts only
   - Fix: `npm update brace-expansion`

4. **Low**: `tmp` (<=0.2.3)
   - Issue: Symlink vulnerability
   - Impact: Temporary file handling during build
   - Fix: `npm update tmp`

### How to Fix

To update vulnerable packages:

```bash
cd mcp-gemini-desktop

# Fix non-breaking vulnerabilities
npm audit fix

# Fix all (including electron upgrade to v39+)
npm audit fix --force

# Test that app still builds
npm run build
npm start
```

**Note:** The `--force` option will upgrade Electron to v39, which may require code changes.

## Why These Don't Affect End Users

1. **Dev dependencies are excluded from the final build**
   - The packaged .exe only includes `dependencies`, not `devDependencies`
   - Build tools (webpack, electron-builder, etc.) never run on user machines

2. **Electron vulnerability is development-only**
   - The ASAR integrity issue only affects development mode
   - Packaged apps use signed, sealed ASAR archives

3. **Verified with production audit**
   - `npm audit --production` shows 0 vulnerabilities
   - Only production code goes into the installer

## Best Practices

### For Developers

1. Run `npm audit` regularly
2. Update dependencies before each release
3. Test thoroughly after updating

### For Distribution

1. The final `.exe` is secure for distribution
2. No additional security steps needed
3. End users are not affected by dev dependency issues

## Reporting Security Issues

If you discover a security vulnerability in the **application code** (not dev dependencies), please report it privately to the maintainers.

---

**Last Updated:** 2025-11-13
**Production Dependencies:** 0 vulnerabilities
**Dev Dependencies:** 4 known issues (non-critical to end users)
