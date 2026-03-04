import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Navigation, Pagination } from 'swiper/modules';

const API_BASE = "http://localhost:8000";

const BlogSection = () => {
  const [blogPosts, setBlogPosts] = useState([]);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await fetch(`${API_BASE}/blogs-public?limit=20&offset=0`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setBlogPosts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error loading blogs:', err);
        setBlogPosts([]);
      }
    };
    fetchBlogs();
  }, []);

  return (
    <section className="py-44 bg-gray-50 px-4 sm:px-10">
  <div className="max-w-7xl mx-auto text-center mb-14">
    <h2 className="text-4xl sm:text-5xl font-bold text-gray-800">From Our Blog</h2>
    <p className="mt-4 text-lg text-gray-600">Stay informed and empowered with the latest insights in dental care.</p>
  </div>

  <div className="relative">
    <Swiper
      modules={[Navigation, Pagination]}
      spaceBetween={24}
      slidesPerView={3}
      navigation
      pagination={{ clickable: true, el: '.custom-pagination' }}
      breakpoints={{
        640: { slidesPerView: 1 },
        768: { slidesPerView: 2 },
        1024: { slidesPerView: 3 },
      }}
      className="pb-12" // adaugă spațiu sub carduri pentru pagination
    >
      {blogPosts.map((post) => (
        <SwiperSlide key={post.id} className="px-3">
          <div className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition mb-4">
            <img
              src={post.featured_image_url || '/images/default-blog.jpg'}
              alt={post.title}
              className="h-54 w-full object-cover"
            />
            <div className="p-6 flex flex-col justify-between h-[250px]">
              <div>
                <p className="text-sm text-gray-500 mb-2">
                  {post.published_at || post.created_at
                    ? new Date(post.published_at || post.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : ''}
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mb-2">{post.title}</h3>
                <p className="text-gray-600 text-sm line-clamp-3">{post.short_description}</p>
              </div>
              <a
                href={post.post_type === 'external' ? post.external_link : `/blog/${post.id}`}
                className="mt-4 inline-block text-[#4ba8fa] font-medium hover:underline"
                target={post.post_type === 'external' ? '_blank' : '_self'}
                rel={post.post_type === 'external' ? 'noopener noreferrer' : undefined}
              >
                Read more →
              </a>
            </div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>

    {/* Custom pagination */}
    <div className="custom-pagination mt-6 flex justify-center"></div>

    {/* Butoanele navigation mai "afara" din carduri */}
    <div className="swiper-button-prev !left-[-40px] !top-1/2 !-translate-y-1/2"></div>
    <div className="swiper-button-next !right-[-40px] !top-1/2 !-translate-y-1/2"></div>
  </div>
</section>

  );
};

export default BlogSection;
