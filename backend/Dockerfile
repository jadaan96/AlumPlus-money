FROM node:22-alpine
WORKDIR /app

COPY . .

RUN cd shared && npm install && npm run build && cd .. \
  && npm install \
  && npx prisma generate \
  && npx tsc

ENV NODE_ENV=production
EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
