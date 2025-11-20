FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies in a single layer and clean up
RUN npm ci --only=production && \
    npm cache clean --force

RUN apk add --no-cache \
    libreoffice \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    ttf-liberation \
    ttf-dejavu \
    fontconfig \
    wqy-zenhei \
    dbus \
    udev \
    xvfb \
    mesa-dri-gallium \
    libstdc++ \
    libx11 \
    libxcomposite \
    libxdamage \
    libxi \
    libxtst \
    libxrandr \
    cups-libs \
    alsa-lib \
    pango \
    at-spi2-core \
    libxshmfence \
    libdrm \
    icu-libs \
    && fc-cache -f

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set Puppeteer environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production \
    CHROME_BIN=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/bin/chromium-browser

# Copy only necessary application files (use .dockerignore)
COPY src/ ./src/
COPY config/ ./config/
COPY server.js ./
COPY protos/ ./protos/

# Create temp directory and copy reference.docx
RUN mkdir -p ./temp
COPY temp/reference.docx ./temp/reference.docx

# Set ownership
RUN chown -R nextjs:nodejs /usr/src/app
    
# Chromium uchun /dev/shm muammosini chetlab o'tish (TMP ni /tmp ga yo'naltiramiz)
RUN mkdir -p /tmp/chromium && chmod 1777 /tmp/chromium
ENV TMPDIR=/tmp/chromium

# Non-root user uchun cache papkasi (agar USER ni keyin yoqsangiz, ruxsat muammosi bo'lmasin)
RUN mkdir -p /home/nextjs/.cache && chown -R nextjs:nodejs /home/nextjs


# Start the application
CMD ["node", "server.js"]
